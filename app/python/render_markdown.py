import sys

import markdown
from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import TextLexer, get_lexer_for_filename


def parse_args():
    args = sys.argv[1:]
    if not args:
        raise ValueError("No file path provided.")

    code_mode = False
    use_stdin = False
    path = None

    it = iter(range(len(args)))
    idx = 0
    while idx < len(args):
        arg = args[idx]
        if arg == "--code":
            code_mode = True
        elif arg == "--stdin":
            use_stdin = True
        elif arg == "--path":
            idx += 1
            if idx >= len(args):
                raise ValueError("Missing value for --path.")
            path = args[idx]
        else:
            path = arg
        idx += 1

    if not use_stdin and not path:
        raise ValueError("No file path provided.")

    return code_mode, use_stdin, path


def read_content(use_stdin: bool, path: str | None) -> str:
    if use_stdin:
        return sys.stdin.read()
    if not path:
        raise ValueError("No file path provided.")
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def render_markdown_content(content: str) -> str:
    return markdown.markdown(
        content,
        extensions=["fenced_code", "tables", "codehilite"],
        output_format="html5",
    )


def render_code_content(content: str, path: str | None) -> str:
    try:
        lexer = get_lexer_for_filename(path or "", stripall=False)
    except Exception:
        lexer = TextLexer(stripall=False)

    formatter = HtmlFormatter(linenos="table", cssclass="codehilite")
    style_block = f"<style>{formatter.get_style_defs('.codehilite')}</style>"
    highlighted = highlight(content, lexer, formatter)
    return f"{style_block}{highlighted}"


def main() -> int:
    try:
        code_mode, use_stdin, path = parse_args()
        content = read_content(use_stdin, path)
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if code_mode:
        html = render_code_content(content, path)
    else:
        html = render_markdown_content(content)

    print(html)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
