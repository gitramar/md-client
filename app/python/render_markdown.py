import sys

import markdown


def parse_content() -> str:
    if len(sys.argv) < 2:
        raise ValueError("No file path provided.")

    if sys.argv[1] == "--stdin":
        return sys.stdin.read()

    md_path = sys.argv[1]
    with open(md_path, "r", encoding="utf-8") as handle:
        return handle.read()


def main() -> int:
    try:
        content = parse_content()
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    html = markdown.markdown(
        content,
        extensions=["fenced_code", "tables", "codehilite"],
        output_format="html5",
    )
    print(html)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
