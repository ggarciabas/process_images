#!/bin/bash

# resize
# watermark
# copyright

for path in "./source/new/"*/
do
    for path_image in "$path"*
    do       
        echo $path_image  
        image=$(basename "$path_image")
        album=$(basename "$path")
        newalbum=$(echo $album | sed -e 's/[a-z]//g' | sed -e 's/ /-/' | sed -e 's/ //g')
        echo $image
        mkdir -p "./source/photo/thumb/$newalbum"

        # resize -> {width: 1920, height: 1080, crop: false, upscale: false}
        convert "./source/new/""$newalbum""/""$image" -resize 200x200 -auto-orient -quality 70% "./source/photo/thumb/""$newalbum""/""$image"        

        # watermark
        lw=$(identify -format '%w' "./_logo/logo_branco.bmp")
        lh=$(identify -format '%h' "./_logo/logo_branco.bmp")      
        ih=$(identify -format '%h' "./source/photo/thumb/""$newalbum""/""$image")
        ch=$(echo "0.1 * $ih" | bc -l)
        cw=$(echo "($ch * $lw)/$lh" | bc -l)

        # read
        convert "./_logo/logo_branco.bmp" -resize $(echo $cw)x$(echo $ch)\! logo_.bmp
        echo $cw"x"$ch
        composite -gravity northwest logo_.bmp "./source/photo/thumb/""$newalbum""/""$image" "./source/photo/thumb/""$newalbum""/""$image"
        composite -gravity southeast logo_.bmp "./source/photo/thumb/""$newalbum""/""$image" "./source/photo/thumb/""$newalbum""/""$image"
        
        # copyright
        exiv2 -M"set Exif.Image.Copyright GGarciaBas All rights reserved 2019" "./source/photo/thumb/""$newalbum""/""$image"
    done
done