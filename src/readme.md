**Features**:
- Better looking/useable user interface.
- Ablility to download files in mass.
- Preview videos by hovering mouse over an icon.
- Preview images are zoomable.
- "Drag and drop" videos and find them on the SD card automatically.
- Warning added when pressing delete button.
- More improvements under the hood.

[SD_Card_Menu_Enhancer.js](https://raw.githubusercontent.com/echandler/D-Link_DCS-2330L_scripts/master/src/SD_Card_Menu_Enhancer.js) is intended to be copied and pasted into [tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en), then the @match header near the top of the file should be changed to the address for your camera, for example: 
```
    // @match http*://*/setup.htm  --------->  // @match http://192.168.254.34/setup.htm 
```
(easiest thing to do is just go to your camera's setup menu and copy the address)

As an optional extra I wanted to 'zip' to a video that was saved on the hard drive to download more videos, so the file name can be added to the url with a pound/hash sign infront of it, for example:
```
    http://192.168.254.34/setup.htm#20161022_165500_2553.mp4
```
I created a batch file and added it to the shortcut menu, so all I have to do is right click on the video and select the batch file, it will open chrome and navigate to the video in the sd card menu automatically, very convient.

Example code for the batch file (*the '#%1' at the end is important*):
```
start "" "chrome.exe" http://(your camera's ip address)/setup.htm#%1
```
