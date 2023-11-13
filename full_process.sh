#!/bin/bash

# resize
# watermark
# copyright

for path_image in $(ls "./source/new/")
do 
    echo $path_image  
    image=$(basename "$path_image")
    album=$(basename "$path")
    echo $image

    # resize -> {width: 1920, height: 1080, crop: false, upscale: false}
    magick convert "./source/new/""$image" -resize 1200x700 -auto-orient -quality 90% "./source/photo/thumb/""$image"        

    # watermark
    brasao="brasao_2"
    lw=$(magick identify -format '%w' "./_logo/""$brasao"".png")
    lh=$(magick identify -format '%h' "./_logo/"$brasao".png")      
    ih=$(magick identify -format '%h' "./source/photo/thumb/""$image")
    echo $lw $lh $ih
    ch=$(echo "0.25 * $ih" | bc -l)
    cw=$(echo "($ch * $lw)/$lh" | bc -l)

    # read
    magick convert "./_logo/"$brasao".png" -resize $(echo $cw)x$(echo $ch)\! logo_brasao.png
    echo $cw"x"$ch

    # watermark
    mpv="mpv_3" # checked
    lw=$(magick identify -format '%w' "./_logo/""$mpv"".png")
    lh=$(magick identify -format '%h' "./_logo/"$mpv".png")      
    ih=$(magick identify -format '%h' "./source/photo/thumb/""$image")
    echo $lw $lh $ih
    ch=$(echo "0.18 * $ih" | bc -l)
    cw=$(echo "($ch * $lw)/$lh" | bc -l)
    magick convert "./_logo/"$mpv".png" -resize $(echo $cw)x$(echo $ch)\! logo_mpv.png
    echo $cw"x"$ch

    # watermark
    water="water_mark_a8" # checked
    lw=$(magick identify -format '%w' "./_logo/""$water"".png")
    lh=$(magick identify -format '%h' "./_logo/"$water".png")      
    ih=$(magick identify -format '%h' "./source/photo/thumb/""$image")
    echo $lw $lh $ih
    ch=$(echo "0.4 * $ih" | bc -l)
    cw=$(echo "($ch * $lw)/$lh" | bc -l)
    magick convert "./_logo/"$water".png" -resize $(echo $cw)x$(echo $ch)\! logo_water.png
    echo $cw"x"$ch

    magick composite -gravity southwest logo_brasao.png "./source/photo/thumb/""$image" "./source/photo/thumb/""$image"
    magick composite -gravity northeast logo_mpv.png "./source/photo/thumb/""$image" "./source/photo/thumb/""$image"
    magick composite -gravity center logo_water.png "./source/photo/thumb/""$image" "./source/photo/thumb/""$image"
    
    # copyright
    exiv2 -M"set Exif.Image.Copyright Rancheiros MC All rights reserved 2023" "./source/photo/thumb/""$image"
done