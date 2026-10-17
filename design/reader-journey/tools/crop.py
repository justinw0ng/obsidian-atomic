from PIL import Image, ImageChops
import glob
for f in sorted(glob.glob('/workspace/reader-openpencil/export/*.png')):
    im0=Image.open(f).convert('RGBA'); im=Image.new('RGBA',im0.size,(235,234,230,255)); im.alpha_composite(im0); im=im.convert('RGB'); bg=Image.new('RGB',im.size,im.getpixel((im.width-1,im.height-1)))
    l,t,r,b=ImageChops.difference(im,bg).getbbox(); P=48
    im.crop((max(0,l-P),max(0,t-P),min(im.width,r+P),min(im.height,b+P))).save(f)
