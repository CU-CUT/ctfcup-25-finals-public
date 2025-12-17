For this challenge to work properly you need:

1. files /root/flag and /root/updateKey which both contain exactly 16-byte secrets
/root/flag is not supposed to be the flag that user submits to CTFd and is instead used as root password

2. binary update_validator must be SUID

3. /opt/updates shall be readable for user

4. user is informed that /root/flag exists 
