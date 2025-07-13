#!/bin/bash
export PATH="/nix/store/$(ls /nix/store/ | grep nodejs | head -1)/bin:$PATH"
export NODE_ENV=development
exec "$@"
