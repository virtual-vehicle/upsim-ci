currDir=$(dirname $0)

mkdir -p $currDir/resources_local

cp -r $currDir/../../../../../../resources/models $currDir/resources_local
cp -r $currDir/../../../../../../resources/system $currDir/resources_local
cp -r $currDir/../../../../../../resources/parameters $currDir/resources_local

chmod -R 777 $currDir/resources_local

cd $currDir/resources_local && ls -R
cd $currDir/resources_local/system && ls -R

mkdir -p $currDir/data/uq_ssd
mkdir -p $currDir/data/uq_res

cd $currDir/ssv_ssd_integrator && chmod +x install_prerequisites.sh && ./install_prerequisites.sh