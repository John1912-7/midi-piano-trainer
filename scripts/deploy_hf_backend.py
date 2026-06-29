import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


SPACE_ID = os.getenv("HF_SPACE_ID", "John1912-7/midi-piano-trainer-backend")
ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"


def main() -> int:
    try:
        from huggingface_hub import HfApi
    except ImportError:
        print("Missing huggingface_hub. Install it with: python -m pip install --user huggingface_hub")
        return 1

    token = os.getenv("HF_TOKEN")
    api = HfApi(token=token)

    print(f"Creating or reusing Hugging Face Space: {SPACE_ID}")
    try:
        api.create_repo(
            repo_id=SPACE_ID,
            repo_type="space",
            space_sdk="docker",
            private=False,
            exist_ok=True,
        )
    except Exception as error:
        print("Could not create the Space. Hugging Face authentication is probably missing.")
        print("Create a Hugging Face write token, then run:")
        print("$env:HF_TOKEN = \"hf_your_token_here\"")
        print("python scripts/deploy_hf_backend.py")
        print(f"Original error: {error}")
        return 1

    with tempfile.TemporaryDirectory(prefix="midi-hf-space-") as temp_dir:
        temp_path = Path(temp_dir)
        remote = f"https://huggingface.co/spaces/{SPACE_ID}"
        run(["git", "clone", remote, str(temp_path)])

        for name in ["app.py", "requirements.txt", "Dockerfile", "README.md"]:
            shutil.copy2(BACKEND / name, temp_path / name)

        run(["git", "add", "app.py", "requirements.txt", "Dockerfile", "README.md"], cwd=temp_path)
        if has_changes(temp_path):
            run(["git", "commit", "-m", "Deploy MIDI Piano Trainer backend"], cwd=temp_path)
            run(["git", "push"], cwd=temp_path)
        else:
            print("Space files are already up to date.")

    print(f"Backend URL: https://{SPACE_ID.replace('/', '-')}.hf.space")
    return 0


def has_changes(cwd: Path) -> bool:
    result = subprocess.run(["git", "status", "--short"], cwd=cwd, text=True, capture_output=True, check=True)
    return bool(result.stdout.strip())


def run(command: list[str], cwd: Path | None = None) -> None:
    subprocess.run(command, cwd=cwd, check=True)


if __name__ == "__main__":
    sys.exit(main())
