"""Route PRs using trusted base rules and the original PR author, not the actor."""

import argparse
from pathlib import Path


INSTRUCTOR_LOGIN = "hgsk"
REPOSITORY = "hgsk/edu"
SUBMISSION_DOCS = {
    "hht/submissions/README.md",
    "hht/submissions/local-submission.md",
}
STUDENT_PREFIXES = (
    "hht/submissions/", "hht/starter-site/", "hht/portfolio/",
    "hht/practice-server/",
)


def requires_grading(author: str, head_repository: str, changed: list[str]) -> bool:
    # Fail closed for every other author, forks, empty diffs and student work.
    if author != INSTRUCTOR_LOGIN or head_repository != REPOSITORY or not changed:
        return True
    return any(
        path not in SUBMISSION_DOCS and path.startswith(STUDENT_PREFIXES)
        for path in changed
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--author", required=True)
    parser.add_argument("--head-repository", required=True)
    parser.add_argument("--changed-files", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--summary", type=Path, required=True)
    args = parser.parse_args()
    changed = args.changed_files.read_text(encoding="utf-8").splitlines()
    grade = requires_grading(args.author, args.head_repository, changed)
    with args.output.open("a", encoding="utf-8") as output:
        output.write(f"grade={'true' if grade else 'false'}\n")
    if not grade:
        args.summary.write_text(
            "## HHT 教材保守PR\n\n講師 hgsk による同一リポジトリの教材変更です。"
            "学生成果物の変更がないため採点対象外です。Qualityで教材を検証します。\n",
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
