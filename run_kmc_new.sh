# !/usr/bin/env bash

#working directory to run kmc and store files
WORKING_DIR=$1
#input file containing paths to fastq files for sample, one on each line
SAMPLE_INPUT_FILE=$2

KMER_LIST_PATH="reference/25mer_rc_list.tsv"

#get sample name as text following last forward slash and before file extension in SAMPLE_INPUT_FILE
if [[ "$SAMPLE_INPUT_FILE" =~ /([^/]+)\.[^/.]+$ ]]; then
    SAMPLE_NAME="${BASH_REMATCH[1]}"
    echo "Sample name: $SAMPLE_NAME"
else
    echo "Could not extract sample name"
fi

SAMPLE_DIR="${WORKING_DIR}/${SAMPLE_NAME}"
KMC_TMP_DIR="${SAMPLE_DIR}/tmp"

#make working directory and tmp directory for running kmc
mkdir -p "$WORKING_DIR" "$SAMPLE_DIR" "$KMC_TMP_DIR"

#run kmc
kmc-3.2.4/bin/kmc \@"$SAMPLE_INPUT_FILE" \
    "${SAMPLE_DIR}/${SAMPLE_NAME}_kmers" \
    "${KMC_TMP_DIR}" \
    -k 25 -ci 0 -cs 1000000000000000 -t 16

#use kmc transform to get all kmers found in sample
kmc-3.2.4/bin/kmc_tools transform \
    "${SAMPLE_DIR}/${SAMPLE_NAME}_kmers" \
    dump \
    "${SAMPLE_DIR}/${SAMPLE_NAME}_kmers_dump.txt"

#parse all kmers and determine frequency of variable position kmers
python-3.8.2/bin/python3 parse_kmc_output.py "$KMER_LIST_PATH" \
    "${SAMPLE_DIR}/${SAMPLE_NAME}_kmers_dump.txt" \
    "${WORKING_DIR}/${SAMPLE_NAME}_strain_output.txt" \
    "${WORKING_DIR}/${SAMPLE_NAME}_barplot.png"

rm -r "${SAMPLE_DIR_PATH}/"
