#!/usr/bin/env bash
# Learning path runner (see lab/path/runner.js and specs/003-end-to-end-learning-path/contracts/lesson-source.md).
# Needs Docker and Node. Bash only; on Windows run it in Git Bash.
exec node "$(dirname "${BASH_SOURCE[0]}")/runner.js" path "$@"
