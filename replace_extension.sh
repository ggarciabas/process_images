fext=$1
for old in './source/new'/*/*.$fext; do
  fname=$(echo \"$old\");
  # echo $fname;
  dir=$(eval dirname $fname)
  # echo $dir;
  frep=$(eval basename $fname \".$fext\")
  # echo $frep
  rpath=$(echo \"$dir/$frep.jpg\")
  # echo $rpath
  eval mv $fname $rpath
done
