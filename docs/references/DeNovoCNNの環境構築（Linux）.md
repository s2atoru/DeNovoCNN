1. Minicondaのインストール
	- [Installing Miniconda - Anaconda](https://www.anaconda.com/docs/getting-started/miniconda/install#linux)
	- Anacondaを使用しないための設定（注：この設定をしてもinstallするパッケージによってはAnacondaが使われてしまいます）
			`conda config --add channels conda-forge`
			`conda config --add channels bioconda`
			`conda config --set channel_priority strict`
2. 環境の構築（tensorflow_env_biocondaという環境ができる）
	`conda env create -f environment_bioconda.yml`
		- 環境のactivate
			`conda activate tensorflow_env_bioconda`
		- 環境のdeactivate（終了する際）
			`conda deactivate`
		
3. DeNovoCNNのダウンロード
	- git clone https://github.com/Genome-Bioinformatics-RadboudUMC/DeNovoCNN.git
4. VCF, BAM, genomeデータのダウンロード
	- wgetを使う
	- 容量が大きい（約500G）のでIBMのクラウドを使う場合、共用の場所に置いた方がいいと思います。
	- ファイルのURL
		- Son VCF: ftp://ftp-trace.ncbi.nlm.nih.gov/giab/ftp/release/AshkenazimTrio/HG002_NA24385_son/NISTv3.3.2/GRCh37/HG002_GRCh37_GIAB_highconf_CG-IllFB-IllGATKHC-Ion-10X-SOLID_CHROM1-22_v.3.3.2_highconf_triophased.vcf.gz
		- Father VCF: ftp://ftp-trace.ncbi.nlm.nih.gov/giab/ftp/release/AshkenazimTrio/HG003_NA24149_father/NISTv3.3.2/GRCh37/HG003_GRCh37_GIAB_highconf_CG-IllFB-IllGATKHC-Ion-10X_CHROM1-22_v.3.3.2_highconf.vcf.gz
		- Mother VCF: ftp://ftp-trace.ncbi.nlm.nih.gov/giab/ftp/release/AshkenazimTrio/HG004_NA24143_mother/NISTv3.3.2/GRCh37/HG004_GRCh37_GIAB_highconf_CG-IllFB-IllGATKHC-Ion-10X_CHROM1-22_v.3.3.2_highconf.vcf.gz
		- Son BAM: ftp://ftp.ncbi.nlm.nih.gov/giab/ftp/data/AshkenazimTrio/HG002_NA24385_son/NIST_HiSeq_HG002_Homogeneity-10953946/HG002Run01-11419412/HG002run1_S1.bam
		- Father BAM: ftp://ftp.ncbi.nlm.nih.gov/giab/ftp/data/AshkenazimTrio/HG003_NA24149_father/NIST_HiSeq_HG003_Homogeneity-12389378/HG003Run01-13262252/HG003Run01_S1.bam
		- Mother BAM: ftp://ftp.ncbi.nlm.nih.gov/giab/ftp/data/AshkenazimTrio/HG004_NA24143_mother/NIST_HiSeq_HG004_Homogeneity-14572558/HG004Run01-15133132/HG004Run01_S1.bam
		- GENOME: http://igenomes.illumina.com.s3-website-us-east-1.amazonaws.com/Homo_sapiens/UCSC/hg19/Homo_sapiens_UCSC_hg19.tar.gz
5. baiファイルの作成（フォルダ名は適宜変更）
		- Pythonで実行する
	```
	import pysam
	pysam.index("/home1/sugimoto/denovo/HG002run1_S1.bam")
	pysam.index("/home1/sugimoto/denovo/HG003Run01_S1.bam")
	pysam.index("/home1/sugimoto/denovo/HG004Run01_S1.bam")
	```
6. 実行（フォルダ名は適宜変更）
	`./apply_denovocnn.sh --workdir=./output --child-vcf=/home1/sugimoto/denovo/HG002_GRCh37_GIAB_highconf_CG-IllFB-IllGATKHC-Ion-10X-SOLID_CHROM1-22_v.3.3.2_highconf_triophased.vcf.gz --father-vcf=/home1/sugimoto/denovo/HG003_GRCh37_GIAB_highconf_CG-IllFB-IllGATKHC-Ion-10X_CHROM1-22_v.3.3.2_highconf.vcf.gz --mother-vcf=/home1/sugimoto/denovo/HG004_GRCh37_GIAB_highconf_CG-IllFB-IllGATKHC-Ion-10X_CHROM1-22_v.3.3.2_highconf.vcf.gz --child-bam=/home1/sugimoto/denovo/HG002run1_S1.bam --father-bam=/home1/sugimoto/denovo/HG003Run01_S1.bam --mother-bam=/home1/sugimoto/denovo/HG004Run01_S1.bam --snp-model=./models/snp --in-model=./models/ins --del-model=./models/del --genome=/home1/sugimoto/denovo/Homo_sapiens/UCSC/hg19/Sequence/WholeGenomeFasta/genome.fa --output=predictions.csv`