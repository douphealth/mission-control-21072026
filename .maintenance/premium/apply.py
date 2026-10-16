import base64
import hashlib
import json
import lzma
import pathlib
import subprocess

BASE = "34efd17de84ddb1707f99e000f8d68d98581150c"
EXPECTED = "efd23347376d982dde865c306e844e131a300d098d8e46fc2b24272dfea08b04"
root = pathlib.Path.cwd().resolve()
parts = [root / f".maintenance/premium/part-{i}.b64" for i in range(4)]
encoded = "".join(part.read_text().strip() for part in parts)
payload = lzma.decompress(base64.b64decode(encoded, validate=True))
assert hashlib.sha256(payload).hexdigest() == EXPECTED, "Payload checksum mismatch; source unchanged"
manifest = json.loads(payload)
assert manifest["base"] == BASE
subprocess.run(["git", "merge-base", "--is-ancestor", BASE, "HEAD"], check=True)
proposed = {}
for change in manifest["changes"]:
    path = pathlib.PurePosixPath(change["path"])
    assert not path.is_absolute() and path.parts[0] in {"src", "scripts"} and ".." not in path.parts
    target = root / path
    assert target.resolve().is_relative_to(root) and not target.is_symlink()
    old = target.read_bytes() if target.exists() else b""
    assert hashlib.sha256(old).hexdigest() == change["old"], f"Base changed: {path}; source unchanged"
    lines = old.decode("utf-8").splitlines(keepends=True)
    for edit in reversed(change["edits"]):
        assert 0 <= edit["start"] <= edit["end"] <= len(lines)
        lines[edit["start"]:edit["end"]] = edit["lines"]
    new = "".join(lines).encode("utf-8")
    assert hashlib.sha256(new).hexdigest() == change["new"], f"Result checksum mismatch: {path}"
    assert target not in proposed, "Duplicate source path"
    proposed[target] = new
for target, content in proposed.items():
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
print(f"Verified and applied {len(proposed)} source files against {BASE}; no application data or credentials touched.")
