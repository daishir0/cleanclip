from PIL import Image
icon = Image.open('/home/ec2-user/hirashimallc/35_pj-expo/cleanclip18084/assets/icon.png')
favicon = icon.resize((64, 64), Image.LANCZOS)
favicon.save('/home/ec2-user/hirashimallc/35_pj-expo/cleanclip18084/assets/favicon.png')
print('Generated favicon.png')
