# zm-ftpd-bridge
A bridge that takes ftp uploads and turns them into motion commands for ZMTrigger


The cameras I use (sv3c poe cameras) only support email or ftp upload on motion alarm. So this is a bridge between
the motion alarms and zoneminder. It takes an upload to `/motion/<camera id number>` and sends it to zmtrigger,
To use it after cloning the repository run `npm install` then `npm start`. It will generate a config.json that you can adjust
to your needs. Be sure your correct ip goes in the `ftpd` section then put your zmtrigger information in the `fs` section. 
You can upload per camera settings as `/motion/<camera id>.json` and it will store that data into the configuration file.
