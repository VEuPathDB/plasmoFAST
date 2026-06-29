# plasmoFAST — Original Python Tool

k-mer based tool for detecting Plasmodium falciparum lab strains from sequencing data.

Developed using [kmc (v3.2.4)](https://github.com/refresh-bio/KMC), python3 (v3.8.2), pandas, and matplotlib

### File Overview

**run_kmc_new.sh:** Bash script used to run plasmoFAST. First runs kmc on sequencing data and identify frequency of variable positions. Kmc generates a list of all kmers found in sequencing data and their frequency, which is passed to parse_kmc_output.py to determine the frequency of variable positions.

```
bash run_kmc_new.sh /path/to/working_directory /path/to/sample_input_file.txt
```
- **/path/to/working_directory** is the path to the working directory for analysis to be run in (note lack of trailing backslash)
- **/path/to/sample_input_file.txt** is the path to a txt file containing path(s) to fastq file(s) for sample, one path on each line. Sample name is extracted from file name 

**parse_kmc_output.py:** Python script called by run_kmc_new.sh to parse kmc output and determine frequency of variable positions. Script first reads in kmers for variable positions provided in `reference/25mer_rc_list.tsv` and stores in dictionaries based on whether they are strain specific or non-strain specific. Next, the output of kmc is read in and it determines the frequency of strain specific and non-specific kmers for each variable position. Based on the number of kmers found for each variable position, and the proportion of specific vs non-specific positions, plasmoFAST determines if each variable position is "Low Coverage", "Specific", "Nonspecific", or "Mixed". Pandas is then used to provide a stacked barplot of, for each strain, the proportion of positions found. 

**reference/25mer_rc_list.tsv:** Tab-delimited text file containing curated list of 25mers used to differentiate Pf lab strains. For each variable position plasmoFAST uses, there are two lines, for the forward and reverse sequences of each kmer. Each line contains the chromosome, position of variable position, strain specific 25bp kmer, non-specific 25bp kmer, and strain. This file is read in by parse_kmc_output.py to be stored as a dictionary and searched for in user-provided sequencing data.

### Output
plasmoFAST outputs a {sample_name}_strain_output.txt file with the breakdown of "Low Coverage", "Specific", "Nonspecific", or "Mixed" positions found for each laboratory strain, as well as a stacked barplot representing this data.
