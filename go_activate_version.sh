#!/bin/bash

GOROOT=$(go1.21.8 env GOROOT)
PATH=$GOROOT/bin:$PATH

export GOROOT
export PATH

go version
