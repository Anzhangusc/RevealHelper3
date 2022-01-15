#!/bin/bash
for i in $(ps -ef | awk '$NF~"main.js" {print $2}'); do
    echo "$i"
    `sudo kill -9 $i`
done
