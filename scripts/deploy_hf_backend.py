import os
import sys
from pathlib import Path


SPACE_NAME = os.getenv("HF_SPACE_NAME", "midi-piano-trainer-backend")
SPACE_ID = os.getenv("HF_SPACE_ID")
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
    namespace = SPACE_ID.split("/", 1)[0] if SPACE_ID else api.whoami()["name"]
    space_id = SPACE_ID or f"{namespace}/{SPACE_NAME}"

    print(f"Creating or reusing Hugging Face Space: {space_id}")
    try:
        api.create_repo(
            repo_id=space_id,
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

    api.upload_folder(
        repo_id=space_id,
        repo_type="space",
        folder_path=str(BACKEND),
        path_in_repo=".",
        allow_patterns=["app.py", "requirements.txt", "Dockerfile", "README.md"],
        commit_message="Deploy MIDI Piano Trainer backend",
    )

    print(f"Backend URL: https://{space_id.replace('/', '-')}.hf.space")
    return 0


if __name__ == "__main__":
    sys.exit(main())
