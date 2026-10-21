"""data.py と templates/index.html から output/index.html を生成する。"""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape

from data import BRANCHES, SHOP


BASE = Path(__file__).resolve().parent


def main():
    env = Environment(
        loader=FileSystemLoader(BASE / "templates"),
        autoescape=select_autoescape(["html", "xml"], default_for_string=True),
        undefined=StrictUndefined,
        keep_trailing_newline=True,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    html = env.get_template("index.html").render(shop=SHOP, branches=BRANCHES)
    output = BASE / "output" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding="utf-8")
    print("Generated: output/index.html")


if __name__ == "__main__":
    main()
