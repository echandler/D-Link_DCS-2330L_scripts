[SD_Card_Menu_Enhancer.js](https://raw.githubusercontent.com/echandler/D-Link_DCS-2330L_scripts/master/src/SD_Card_Menu_Enhancer.js) is intended to be copied and pasted into [tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en), then the @match header near the top of the file should be changed to the address for your camera, for example: 

        // @match http*://*/setup.htm  --------->  // @match http://192.168.254.34/setup.htm 

(easiest thing to do is just go to your camera's setup menu and copy the address).

**Features**:
- Better looking/useable user interface.
- Ablility to download files in mass.
- Preview videos by hovering mouse over an icon.
- Preview images are zoomable.
- Warning added when pressing delete button.
- More improvements under the hood.
