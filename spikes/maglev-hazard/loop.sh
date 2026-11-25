#!/bin/zsh
# app/test/worker.test.ts, K copies at a time for N rounds, with Node's FLAGS; keeps the output of each failed run
# in $TMPDIR. With Maglev on, past the engine's guard: ./loop.sh 100 4 "--no-maglev --maglev" (the last flag wins).
cd ${0:a:h}/../../app
N=${1:-100}; K=${2:-4}; FLAGS=(${=3:---no-maglev})
OUT=${TMPDIR:-/tmp}/maglev-hazard; mkdir -p $OUT
fails=0; runs=0
for r in $(seq 1 $N); do
  pids=()
  for k in $(seq 1 $K); do node $FLAGS --test test/worker.test.ts > $OUT/run-$r-$k.log 2>&1 & pids+=($!); done
  for i in $(seq 1 $K); do
    if wait ${pids[$i]}; then rm -f $OUT/run-$r-$i.log; else fails=$((fails+1)); echo "FAIL round $r copy $i: $OUT/run-$r-$i.log"; fi
    runs=$((runs+1))
  done
  echo "round $r: $runs runs, $fails failed, $(date +%T)"
done
echo "done: $runs runs, $fails failed"
