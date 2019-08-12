#!/bin/bash

# resize
# watermark
# copyright

folder=$1
size=$2

mkdir -p "./source/photo/"$size"/"

for path in $folder"/"$size"/"*/
do
    for path_image in "$path"*
    do         
        image=$(basename "$path_image")
        album=$(basename "$path")
        newalbum=$(echo $album | sed -e 's/[a-z]//g' | sed -e 's/ /-/' | sed -e 's/ //g')
        echo $image        
        mkdir -p "./source/photo/"$size"/$newalbum"

        cp $folder"/"$size"/"$newalbum"/""$image" "./source/photo/""$size""/""$newalbum""/""$image"

        # autorotate
        convert "./source/photo/""$size""/""$newalbum""/""$image" -auto-orient "./source/photo/""$size""/""$newalbum""/""$image"

        # watermark
        lw=$(identify -format '%w' "./_logo/logo_branco.bmp")
        lh=$(identify -format '%h' "./_logo/logo_branco.bmp")      
        ih=$(identify -format '%h' "./source/photo/""$size""/""$newalbum""/""$image")
        ch=$(echo "0.1 * $ih" | bc -l)
        cw=$(echo "($ch * $lw)/$lh" | bc -l)

        # read
        convert "./_logo/logo_branco.bmp" -resize $(echo $cw)x$(echo $ch)\! logo_.bmp
        echo $cw"x"$ch
        composite -gravity northwest logo_.bmp "./source/photo/""$size""/""$newalbum""/""$image" "./source/photo/""$size""/""$newalbum""/""$image"
        composite -gravity southeast logo_.bmp "./source/photo/""$size""/""$newalbum""/""$image" "./source/photo/""$size""/""$newalbum""/""$image"
        
        # copyright
        exiv2 -M"set Exif.Image.Copyright GGarciaBas All rights reserved 2019" "./source/photo/""$size""/""$newalbum""/""$image"
    done
done