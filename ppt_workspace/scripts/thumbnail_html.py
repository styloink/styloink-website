#!/usr/bin/env python3
"""
Create source-HTML preview grids by screenshotting HTML slides with Chromium.

This is an auxiliary preview path for the html2pptx workflow when LibreOffice
(`soffice`) is unavailable. It screenshots the source HTML, not the final PPTX.
Use it to review design and composition, but do not treat it as proof that
PowerPoint/WPS text layout is safe. When LibreOffice is unavailable, pair this
with `inventory_textgrid.py --issues-only --fail-on-issues` on the generated
.pptx before delivery.

Pipeline:
    HTML files -> Chromium (Python Playwright if available, otherwise the
                  bundled zero-dependency CDP client)
                  -> per-slide PNG screenshot
                  -> reuse thumbnail.py's create_grids() to lay out the grid

Usage:
    # Glob pattern (must be quoted to prevent shell expansion):
    python thumbnail_html.py 'slides/*.html'
    python thumbnail_html.py 'slide-*.html' workspace/preview --cols 4

    # Or pass an explicit ordered list of files:
    python thumbnail_html.py slide1.html slide2.html slide3.html

Defaults match thumbnail.py: 5 columns, JPG output, max cols x (cols+1) per grid.

Viewport: 960 x 540 px (16:9). Override with --viewport WxH.
You typically do NOT need to change this — it's a render canvas, the screenshot
is then resized inside the grid by thumbnail.py.
"""

import argparse
import asyncio
import glob as globlib
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# Ensure sibling modules (e.g. thumbnail.py) resolve regardless of cwd or how
# this script is invoked (python path/to/script.py, runpy, python -c, etc.).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Reuse the grid-building logic from thumbnail.py
from thumbnail import (
    DEFAULT_COLS,
    MAX_COLS,
    THUMBNAIL_WIDTH,
    create_grids,
)


def parse_viewport(spec: str) -> tuple[int, int]:
    try:
        w, h = spec.lower().split("x")
        return int(w), int(h)
    except Exception:
        raise argparse.ArgumentTypeError(
            f"Invalid viewport '{spec}'. Use WIDTHxHEIGHT, e.g. 960x540."
        )


def _natural_sort_key(p: Path) -> list:
    """Sort key that orders embedded numbers numerically (slide2 < slide10)."""
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", p.name)]


def resolve_inputs(inputs: list[str]) -> list[Path]:
    """Expand globs and dedupe while preserving natural numeric order."""
    seen: set[Path] = set()
    resolved: list[Path] = []
    for entry in inputs:
        if any(ch in entry for ch in "*?["):
            matched = sorted(
                (Path(p) for p in globlib.glob(entry)), key=_natural_sort_key
            )
        else:
            matched = [Path(entry)]
        for p in matched:
            p = p.resolve()
            if p not in seen and p.exists():
                seen.add(p)
                resolved.append(p)
    return resolved


class PythonPlaywrightUnavailable(Exception):
    """Raised when the Python `playwright` package is not importable.

    This is recoverable — main() catches it and tries the Node fallback
    before reporting any error to the user.
    """


async def render_html_files(
    html_files: list[Path],
    out_dir: Path,
    viewport: tuple[int, int],
) -> list[Path]:
    """Render each HTML file to a PNG using optional Python Playwright."""
    try:
        from playwright.async_api import async_playwright
    except ImportError as e:
        raise PythonPlaywrightUnavailable(str(e))

    width, height = viewport
    out_paths: list[Path] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width": width, "height": height})
        try:
            for idx, html in enumerate(html_files, start=1):
                page = await context.new_page()
                await page.goto(html.as_uri(), wait_until="networkidle")
                # Wait for fonts to settle so screenshots are stable.
                try:
                    await page.evaluate("document.fonts && document.fonts.ready")
                except Exception:
                    pass
                out_path = out_dir / f"slide-{idx:03d}.png"
                # clip to viewport — html2pptx slides are sized to the body so this matches
                await page.screenshot(path=str(out_path), full_page=False)
                await page.close()
                out_paths.append(out_path)
        finally:
            await context.close()
            await browser.close()
    return out_paths

def render_html_files_via_node(
    html_files: list[Path],
    out_dir: Path,
    viewport: tuple[int, int],
) -> tuple[list[Path] | None, str]:
    """Fallback: use the bundled Node CDP browser client.

    Returns a tuple `(screenshots, error_message)`:
      - on success: (list_of_paths, "")
      - on failure: (None, human-readable reason)
    The caller decides whether and how to surface the error.
    """
    if not shutil.which("node"):
        return None, "node executable not found on PATH"

    width, height = viewport
    file_list = "\n".join(str(p) for p in html_files)
    list_file = out_dir / "_html_list.txt"
    # newline="" disables newline translation: on Windows the default text mode
    # rewrites "\n" to "\r\n", and the Node reader (split on "\n") would then
    # leave a stray "\r" on every path but the last — corrupting the file:// URL
    # so only the final slide renders. Keep newlines verbatim.
    list_file.write_text(file_list, encoding="utf-8", newline="")

    # Reuse the shared discovery so this path also prefers system / accio Chromium.
    finder_path = (Path(__file__).parent / "chromium-finder.js").resolve()
    cdp_path = (Path(__file__).parent / "cdp-browser.js").resolve()

    script = f"""
    const {{ launch }} = require({str(cdp_path)!r});
    const fs = require('fs');
    const path = require('path');
    const {{ pathToFileURL }} = require('url');
    const {{ findChromium }} = require({str(finder_path)!r});

    (async () => {{
      const files = fs.readFileSync({str(list_file)!r}, 'utf-8')
        .split(/\\r?\\n/).map(s => s.trim()).filter(Boolean);
      const found = findChromium();
      if (!found.executablePath) throw new Error('No Chromium-based browser found');
      const browser = await launch({{ executablePath: found.executablePath }});
      const context = await browser.newContext({{ viewport: {{ width: {width}, height: {height} }} }});
      const out = [];
      try {{
        for (let i = 0; i < files.length; i++) {{
          const page = await context.newPage();
          await page.goto(pathToFileURL(files[i]).href, {{ waitUntil: 'networkidle' }});
          try {{ await page.evaluate('document.fonts && document.fonts.ready'); }} catch (e) {{}}
          const outPath = path.join({str(out_dir)!r}, 'slide-' + String(i + 1).padStart(3, '0') + '.png');
          await page.screenshot({{ path: outPath, fullPage: false }});
          await page.close();
          out.push(outPath);
        }}
        process.stdout.write(out.join('\\n'));
      }} finally {{
        await context.close();
        await browser.close();
      }}
    }})().catch(e => {{ console.error(e); process.exit(1); }});
    """
    proc = subprocess.run(
        ["node", "-e", script],
        cwd=str(Path(__file__).parent),
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        reason = (
            f"node exited {proc.returncode} (cwd={Path(__file__).parent}).\n"
            f"--- node stderr ---\n{proc.stderr.strip() or '(empty)'}\n"
            f"--- node stdout ---\n{proc.stdout.strip() or '(empty)'}"
        )
        return None, reason
    return [Path(line) for line in proc.stdout.splitlines() if line.strip()], ""


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create source-HTML preview grids by screenshotting HTML slides with Chromium."
    )
    parser.add_argument(
        "inputs",
        nargs="+",
        help="HTML files or glob patterns. Quote globs to prevent shell expansion.",
    )
    parser.add_argument(
        "-o",
        "--output-prefix",
        default="thumbnails",
        help="Output prefix (default: thumbnails). Creates prefix.jpg or prefix-N.jpg.",
    )
    parser.add_argument(
        "--cols",
        type=int,
        default=DEFAULT_COLS,
        help=f"Grid columns (default: {DEFAULT_COLS}, max: {MAX_COLS}).",
    )
    parser.add_argument(
        "--viewport",
        type=parse_viewport,
        default=(960, 540),
        help="Render viewport WxH in px (default: 960x540, i.e. 16:9).",
    )
    args = parser.parse_args()

    cols = min(args.cols, MAX_COLS)
    if args.cols > MAX_COLS:
        print(f"Warning: Columns limited to {MAX_COLS} (requested {args.cols})")

    html_files = resolve_inputs(args.inputs)
    if not html_files:
        print("Error: no HTML files matched the given inputs.", file=sys.stderr)
        sys.exit(1)

    print(f"Rendering {len(html_files)} HTML slide(s) at viewport {args.viewport[0]}x{args.viewport[1]}")

    output_path = Path(f"{args.output_prefix}.jpg")
    with tempfile.TemporaryDirectory() as temp_dir:
        out_dir = Path(temp_dir)
        # Try the Python Playwright path first; on failure, silently fall
        # back to the bundled Node CDP path. Only surface an error if BOTH
        # paths fail, so a successful fallback produces clean output.
        py_error: str | None = None
        screenshots: list[Path] | None = None
        try:
            screenshots = asyncio.run(
                render_html_files(html_files, out_dir, args.viewport)
            )
        except PythonPlaywrightUnavailable as e:
            py_error = f"Python `playwright` package not installed ({e})"
        except Exception as e:
            py_error = f"Python Playwright runtime error: {e}"

        if screenshots is None:
            screenshots, node_error = render_html_files_via_node(
                html_files, out_dir, args.viewport
            )
            if screenshots is None:
                print(
                    "Error: failed to render HTML slides. Both rendering paths failed.\n"
                    f"  [1] Python Playwright path: {py_error}\n"
                    f"      Fix: pip install playwright && playwright install chromium\n"
                    f"  [2] Node CDP fallback: {node_error}\n"
                    f"      Fix: run `bash <skillDir>/bootstrap.sh` and install "
                    f"Chrome, Edge, or Brave if no Chromium browser is found.",
                    file=sys.stderr,
                )
                sys.exit(1)

        grid_files = create_grids(
            screenshots,
            cols,
            THUMBNAIL_WIDTH,
            output_path,
        )

    # Resolve to absolute paths so callers (humans and agents) get a
    # path they can use directly without an extra `pwd`/`find` step.
    abs_grid_files = [str(Path(f).resolve()) for f in grid_files]
    print(f"Created {len(abs_grid_files)} grid(s):")
    for f in abs_grid_files:
        print(f"  - {f}")


if __name__ == "__main__":
    main()
