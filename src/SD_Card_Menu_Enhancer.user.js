// ==UserScript==
// @name         DCS-2330l SD Card Menu Enhancer
// @version      4
// @match        http*://*/setup.htm
// ==/UserScript==
/* jshint -W097 */
'use strict';

function varWatcher() {
	var objs_to_listen; // Rename 'objs_to_listen' to something else.

	window.watchVar = {};

	window.watchVar.watch = function (p_obj, p_propString, p_funcToCall) {
		var objString = p_obj.toString();

		if (!objs_to_listen) {

			objs_to_listen = {};
		}

		if (!objs_to_listen[objString]) {

			objs_to_listen[objString] = {};
		}

		if (!objs_to_listen[objString][p_propString]) {

			objs_to_listen[objString][p_propString] = {
				interval: undefined,
				state: p_obj[p_propString],
				listeners: [p_funcToCall]
			};

			objs_to_listen[objString][p_propString].interval = setInterval(function (p_listenerObj, p_obj, p_propString) {
				var propValue = p_obj[p_propString];

				if (propValue !== p_listenerObj.state) {

					p_listenerObj.state = propValue;

					for (var n = 0; n < p_listenerObj.listeners.length; n++) {

						p_listenerObj.listeners[n](propValue);
					}
				}
			}, 10, objs_to_listen[objString][p_propString], p_obj, p_propString);

		} else {

			objs_to_listen[objString][p_propString].listeners.push(p_funcToCall);
		}

		return p_funcToCall;
	};

	window.watchVar.unWatch = function (p_obj, p_propString, p_funcToRemove) {
		var objString = p_obj.toString();

		if (!objs_to_listen || !objs_to_listen[objString] || !objs_to_listen[objString][p_propString]) {

			return false;
		}

		var array = objs_to_listen[objString][p_propString].listeners;

		for (var n = 0; n < array.length; n++) {

			if (array[n] === p_funcToRemove) {

				array.splice(n, 1);
			}
		}

		if (array.length === 0) {

			clearInterval(objs_to_listen[objString][p_propString].interval);

			delete objs_to_listen[objString][p_propString];
		}
	};
}

function main() {

	/* 
	This is basically the main function that initiates the script. test

	It get's added to a script tag and loaded on the page so the code has 
	access to the "native" camera functions like the "changeFolder" function
	and global variables (designated as -> g_*).
	*/

	// ~~~~ Add a notification to the corner so everyone knows the script is running. ~~~~
	var div = document.createElement('div');
	div.innerHTML = 'DCS-2330l SD Card Menu Enhancer v 4.0'; // Change this version when updateing script also!
	div.id = 'DCS-2330l_SD_Card_Menu_Enhancer_notification';

	document.body.appendChild(div);
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	// See if they are searching for a video, run this only once at first page load.
	setTimeout(function () {

		findVideoOnCamera.init(location.hash);

	}, 1500);

	// ~~~~ Add some custom css to the page once. ~~~~
	if (!document.getElementById('DCS-2330l SD Card Menu Enhancer styles')) {
		var styleEl = document.createElement('style');
		styleEl.id = 'DCS-2330l SD Card Menu Enhancer styles';
		styleEl.innerHTML =
			" a { text-decoration: none; }\n "
			+ "a:hover { text-decoration: underline; }\n "
			+ "#maincontent_container { visibility: hidden; }\n "
			+ "#maincontent table table { border-collapse: collapse; }\n "
			+ "#maincontent table table tbody tr:first-child { background-color: rgb(255, 111, 0); border-top: 2px solid rgb(255, 111, 0); border-bottom: 2px solid rgb(255, 111, 0); }\n "
			+ "#maincontent table table tbody tr:first-child td { line-height: 15px !important;}\n "
			+ "#maincontent table table tbody tr:first-child td:not(:first-child) { border-left: 1px solid rgb(0,0,0); }\n "
			+ "#maincontent table table td { border-top: 1px solid rgb(202, 202, 202); padding: 5px 0px 4px 10px; line-height: 20px; }\n "
			+ "#maincontent table table input[type='checkbox'] { margin: 3px 3px 2px 4px; }\n "
			+ "#sd_table_container { margin: 10px 0px; border: 1px solid rgb(255, 111, 0); }\n "
			+ "#sd_table_container * { font-size: 13px; }\n "
			+ "body { letter-spacing: -0.003em; }\n"
			+ "#delall_label:hover { cursor: cursor: n-resize;}\n"
			+ "#DCS-2330l_SD_Card_Menu_Enhancer_notification { position: fixed; top: 1px; left: 1px; }\n ";

		document.head.appendChild(styleEl);
	}
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	// Watch for changes to g_lockLink.
	watchVar.watch(window, 'g_lockLink', function(p_lockLinkValue) {

		if (p_lockLinkValue || !isOnSDCardMenu() || g_thispath.toLowerCase().indexOf('picture') >= 0) {

			document.querySelector('#maincontent_container').style.visibility = 'visible';

			return;
		}

		updateSDCardPath();

		updateTable();

		document.getElementById('okBtn').value = 'OK/Delete';

		document.querySelector('#maincontent_container').style.visibility = 'visible';
	});

	// Update the sd card menu table element to a fancier version.
	function updateTable() {
		var table = document.querySelector('#maincontent table table');
		var previewAnchor = undefined;
		var dateAnchorsArray = [];
		var downloadFilesButton = undefined;

		table.border = 0;
		table.style.backgroundColor = 'rgb(241, 241, 241)';

		// Wrap the table in a div, another idea from github. Fixes the css border issue with tables.
		table.parentElement.innerHTML = "<div id='sd_table_container'>"+ table.outerHTML +"</div>";

		// Check for anchors and strongs after the table has been over written.
		var anchors = document.querySelectorAll('#maincontent table table a');
		var strongs = document.querySelectorAll('#maincontent strong');

		// Change the 'Delete' column header text to 'Select',and add label.
		document.getElementById('delall').parentElement.innerHTML = document.getElementById('delall').parentElement.innerHTML.replace(/Delete/, '<label id"delall_label" for="delall">Select</label>');
		document.getElementById('delall').style.display = 'none'; // <- Remove the annoying checkbox.

		if (g_folderslistStr) {

			// Change the "File" column to "Folder" if on a folders page.
			strongs[1].innerHTML = 'Folder';

		} else if (g_filelistStr) {

			// Change the "Num of files" column to "Type" if on a folders page.
			strongs[2].innerHTML = 'Type';

			downloadFilesButton = document.getElementById('okBtn').cloneNode(true);
			downloadFilesButton.onclick = downloadSelected;
			downloadFilesButton.value = 'Download Files';
			downloadFilesButton.style.marginLeft = '10px';

			document.getElementById('okBtn').parentElement.appendChild(downloadFilesButton);
		}

		// Used for remembering the last thing they clicked on in that particular path. Got the idea from github.
		window.rememberObj = window.rememberObj || {};

		for (var n = 0; n < anchors.length; n++) {

			anchors[n].style.cssText = 'background-position: left center; background-repeat: no-repeat; padding-left: 20px; background-size: 12px 12px;';

			// Default folder icon. Artist website: http://www.aha-soft.com.
			anchors[n].style.backgroundImage = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABqElEQVQ4T6VTvS9DURT/nTZtRDSSIkKiQVLaki6MkjKw8A8YSYgarCa7TRgQTDabxSAG6cMiEdJomiZNDKUDC/VIq+HI/XivT5RK3OHed2/O+X3d+wj/HGT1F08xB8bGFzxCvG4Im79xUPEEbBV4+rfg8kXl9uM5ifL1bE19EsDTuwxXQ0QVa02sYcWWSR/rM7GwmUY5swgJ4O1bdTDZrkSZjSiBLAIN9JZaAL0cu7iuZx4EAoNBgk4XShWlPIq5fY2lAK1Zro9HXvZ1jlT1+vGag3mfhS8Uh7tlAkysiBggAp6McdD9QT37Ax02AGnVpac8zMI7/JFJuJtGFStpG9rYQ2IadLvfyFZgKirBooJrH5wC1Xfrs4p0y8ZdYgmU3WvmrtiMDt+Oypnfd3s6xBtjG5TabeNwbEzyKmaW9M7UZaziWEwOHxnjEHS5E+BoLKxZKgpYgMhAqg1VlzTSoPP1bh4YbrSTlUzi4Th6nfevLllqwYVRAJ2tBTnYa8Lf6pHqRLeyIdSKKxMf6mEQq0axLRRcSF15QImV0E86a/4Hjpf/p9qqRZ9P2qYRGbniggAAAABJRU5ErkJggg==)';

			// Got this idea from github, it remembers the last anchor clicked in that folder; when they go back to that 
			// folder it will highlight the row.
			if (window.rememberObj[g_thispath] === anchors[n].href) {

				anchors[n].parentElement.parentElement.style.backgroundColor = 'rgba(212, 212, 212, 0.5)';
			}

			// setAttribute actually changes the HTML, that way it works with the date anchor sorting hack below.
			anchors[n].setAttribute('onmouseup', "("+ function(p_this) {

				window.rememberObj[g_thispath] = p_this.href;

				p_this.style.color = 'purple';
			}.toString() +")(this)");

			// Is it on the page where the image and video files are located?
			if (g_filelistStr) {

				// Remove the original preview image links.
				if (/\.jpg/.test(anchors[n].innerHTML)) {

					anchors[n].parentElement.parentElement.parentElement.removeChild(anchors[n].parentElement.parentElement);

					continue;
				}

				// Video file icon. Artist website: http://www.aha-soft.com/.
				anchors[n].style.backgroundImage = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAEbklEQVRIS42VbUxbZRiG7/NJQYQJGYxhjeAYn9lAWqYgiiAq67ohwwWZGdHIfjCdcTOTRM00LkZdlpiY7McyNlzUzE2WMSkwHIwORmWUZUO+KS1QmHy4DdloS3t6XnOOStKU0L5/zsnJ85zr3Pd9nvel8N/af+DQSZtt8VVCSDQPN+bU5XjIh4Ei4v8lK14JRSPYeRcxfWfhECkA1H1FoOLA0a++qJYapCfy2qp9bUJ36YJSuu/vuY0jRicSNiVAFFcH0DSNod5hlIRZod1eKL/rzbJ37v94pirMA1BUXEK+P30SDocDvbe6cXw0GHGpyRDd7lUV0AwD0+1+FAaa8IpGA47lUPH+B/ihukr++GUFEiAjIwMulwAFTWAIeQ6xKQkgPgAUw8DcN4jMhXbYRQqsBBwdRdWJ454A7Y6dRKVSw+VyIpCh8Pua56GMT/BLgXVoEJkP2rHoEsEyLMbGLKg+dcITkJtfQJqb6mU7jAYDPrm2iKj4RBBxdYsomsHsyCBKI6awu2yP3F+8azdqzv/kDag5fxZLSw4YOw349g8ejz2V5Bdg3jKAohATil4vAcdxKN9bsTJAnSFZ5IKCITAEZYNXxgE+FIBm4LSOIMveDrsAMAyDUZPZG5D9Qg5RpUshOxHEUjA8+iJc62JA+fhNCU2Dm7Ygy6bH4pIIhmVgsYyh9uIvnhalq58lxhsdsocd+qt4r34O9sgNoH0MmkjReGTOjHLlNPZWvCv35+UXoOVKozeg6XID7HY7OttacbiLYHJNrF+AJxbGsSfcjNKyt8FzHHaVlK4MUKlUEAQBCgbQB2RinFnrF+BJ9xxynAbYBCJnYDKZvAGpT6tJWlqaHHIgS6E37CVExif5NWgzwwPYNN8Mm1OUAWMWC1qvXvG0aGN8Ehka7JM9bGlswOHWebz8RiEEp2vVrYLlOTSf+xXaEDMOflQp12ZsyULXjQ5vwPXr1+QM9L814XhfAHKKt0NwOn0AeLRdqEMe34vyin3geR4azY6VAVIGkkUBNIEpehsytxVAcPlQwHHoqGtE3J86OASAZaUMRr0BMbEblzNQsBQsSi3UBRoILh8KOB5dDTpsmNJh0ekGy7KYmBhHt7HT06LHlTHEOmGW7Wioq8WhSzNI02jg9qGA4Tj0NDZgZ6QVn372udyfnLIZ/X093oCb3Z2w2+xoqq/DMSOQmL8Vog8AzXEYbrmMgqAB7D/4oZxBbl7+yoDU1M3Le9FghBbK7DyIwuoZ0CwHa1szEv/Swe4iskUWi8UbELU+mqSkSIB/96KBdVqEP5MH4gNAsRzudrYgZVaHB0tSBgyskxMYGuj3tEgC3JmalD2srTmH8p8nELwlF/ABAMvBbtTjLeUkvvzmmNyfkJTsDYiIjCIz03fkgrqLNSg9YwJJzwVEYdU5AM2CvaXHvtgZHPn6qFwbHh5hv3dvLsjjTF4bub7y4cJCpZuIoQpaBJX7Mf7mI/w6D0KXZhF68zssOgkoinKEhIRWmM0jpyXAP0hjBjep1rt1AAAAAElFTkSuQmCC")';

				// Don't forget to remove this before uploading to the web.
				if (isCorruptVideo(anchors[n])) {

					anchors[n].style.color = 'red';

					// File error icon. Artist website: http://www.aha-soft.com/.
					anchors[n].style.backgroundImage = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAEKUlEQVRIS7WVW2wUVRjHf2dmu23pdlm20AvQ5aJoEBIDCRIQURFKIuwSIYKJUhFfSDS+GMOTUi8xRl+MiUFNDC/eHrhICypEIgaFJkBSxIZbt7Vrt9vupfdt2Z2Zc8xMsbJsW+oDk8xMzvm+7/875/+dzAju8SXusT7/C3B10zN7paD6oWNHXp3qwqYMuLYhpEqXLkAJjeSfYR4+WT+l2ikl3agJqcrgo7j1LCqZIJMVhM9HWH7iyF3r75rQHtq+T/OV1pWvXojR0gJCx+XWibT0k05n65YdO/z2ZHbdFRB+crOauydE5teTiLIqQKHiXbi8fi7/EWflie8n1Zg0GNm0LV6yYvGsIq2Hgse3ULC2xlls9vRJzEMH6EkXEOse6n7khyOVE+1icsDGrapy13oyp3/C89nRHI2B2iCFFbO5fC3FioZDE+pMGIjWbFHe0Bpc6RhmWxue/YdzATufxlURYKA/TVt0kNU/Hh1Xa9zJWGj7O1pZ6Zv+p5aQDbchYx35gF0hXOXVuFE0t/UynDXfXV1/8K07rRofsG6z8r6wAWKtzqmRsU48n3ybU9v3xFK02fPRDAPLNY0LSYP1Px/P08ubiAefrS94YG6weFkA1RHFSiUxL55j+qmrOYDUgmno1feDYeG2FE1/JekaVg3b0snQ7Yn5gG21yvfcKkZOHEX29qDpbmRrC77zsVzAIu8YQJjgloKG5g52pFM5mjmDrrUbOwsXVVS59W7M4QzYnyqpkOHr+BqjEwKUoXBZ8HdqiKZEf+T5oZ55/yaPAboqAkFrxKz3f1iL8XsjyuVytu8A2lrxnW3PBSz2o1fNd3JsgDAkpULn4PUoAhHaMZhssAvGALGimcpb9xJWuAkMhbKj5i1AXy8F6zZT8vp7DmTog71kvjuA7q8Gw3QAGBJdCkbSWY53xHl5pM/Rdh6J8sA+ysvqpr24CuvKdUBDSTkKsCRkDYyWK8iuXgcgvCUI73R0b2UOQJmKUiU41ZkkOXLz853D/XscQJfmU94v38A88wvoLkd0DGBbFI/h+fgbXEuWOwDz0gUGdm9Fmz5zzCJ7B5gKzZDYTf8qEuWVzKAQiRlzGt3Bx1ZqARcqngKl8gHhG/gaO3J78KAPfc7CPIANKrSguW+QpsGBhEgUzVKe/a+RPXsGobvBMvMB7a34fruzyTPRqwLjAmxIsRJ83dmJSMyarzwf7SJ77hwC255R32+3iHQavH5K3v8UraySgdpNmK3X0H2zx3qgblnkWGVI/Lj4IhpBJHxz2ouCawLiPg0GR/4DmBbCvi2JUIqbl5rByNq/A0RxMeg6hb4KyIweUy072gNb3G3CxVSfbdHoKeqeMbddKQKUe5CWQkqJJQSWVFhKYaGcsbTboyznbSiFtCTmrbhpydF8JImbWSwlI7uH++f9A1ILSN66QmVDAAAAAElFTkSuQmCC")';
				}

				anchors[n].innerHTML = anchors[n].innerHTML.replace(/.*(\d\d)(\d\d)(\d\d)\.mp4/, function (x, hour, minutes, seconds) {
					var parsedHour = parseHour(hour);

					return parsedHour.hour + ':' + minutes + ':' + seconds + " " + parsedHour.amPM;
				});

				// Create an anchor to show a preview image of the associated video.
				// The original preview image link will be removed later.
				previewAnchor = document.createElement('a');
				previewAnchor.style.cssText = 'background-position: center left; background-repeat: no-repeat; padding-left: 13px; background-size: 11px 11px;';
				previewAnchor.style.marginLeft = '25px';

				// Preview image icon. Artist website: http://www.aha-soft.com/.        
				previewAnchor.style.backgroundImage = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADK0lEQVQ4T3WSC2yTVRTHf/ejD9e127eu68rajtGHdWxhw4AuBEFGRAIu6HxEERgBgwZJplGWGKNxmgVdJIpoNBoXMVMMC4/YLJoQHeqUCCRidRljjLD5YhS3ajtm+7W95iurL+LJTe495/zOyT83f8H/xNqDP278fDSxF/E3ICV6umTy0eu+zFfF0vfOr45E/+gVklz3nzHRGrpqvf3lIfrv915f4yz8Rm+Kkl0Dsus2D/XOa66Cq1TTv2rTWgb3K0M0OOWB5zfUtNQJMSWKXzgle9cF/gJzInQ1+UsvzOT555oPzqIrfmRxxRZR1HFS7m6am4OuAAKhd/Xzn2EdyP2DgP7T4+wfnkLYnvlqZn9exJW03lNMvb+c4gITBkXkRBiQFClpEkktx+w8cg5hffKoTPw2xZxrvVTZLVQ5rNS6bBQaBSHVwLxSI2YDJNMQiaYY+FUjoyVJpTR29g4iLDs+lpcvp6kMevCoFm7y2QmVWVhYbiJoE+zrH+Hk0AUWhlzct8TPcFxyfDzF+MTvdBz+FlHQ+qGcTit4gx4CDiv31rsI2U1UqwrrX/uMI6d+wu5QmbgU45Y6N93blzEYyzIymWT7W30I87YemRQFVPjdLPPZWb+gnGCJmcMnztG29zjNTTfi95Yx8kOUg+Gv6Wy5gaZFPs5MJLmnM4wwPtAtNbOKy+emqdrBxgXllFoMdPYO8M6xUZY3VJOVEiEER48NsmnxHHasqeXilMbKp3sQhpYumbY6me13syJQSmvDbKQQhCO/8NyhCLYylVlGIxlNIx6N8dQd81lbV4GWybC0rRsxa90bMlPiwRtw43NY6VhRSaFJYTSeYfenw/R9fwGEAjLLzbUuWhuDzC0yEE2kWPXEuwjl7j26N/IuYkPzcnbdWcPZyTTDMY0TYzEuxZM4bGYWVaoEVSN+u4GH90U4EP4CIZpfkrLAiamijGxWks5C+6oAjzX6uDidZSyRJa5JbEZBpU3BaVFoP/QdL77/Cc+2rGwXm8NjD3W9vf/1vN9n/MzWuxp/fnz1POFVzWZ9saIIxmLJ1J6PBjKv9vS5O7fd/mDbrYE3/wRDdSqSyaklCwAAAABJRU5ErkJggg==)';

				previewAnchor.href = anchors[n].href.replace(/(mp4|avi)/i, 'jpg');

				previewAnchor.previewData = {};

				previewAnchor.addEventListener = previewAnchor.addEventListener || function (e, f) { previewAnchor.attachEvent('on' + e, f); };

				previewAnchor.onmouseover = previewAnchorMouseOver; //<= This needs to stay as onmouseover attribute, that way it can be called by other code.
				previewAnchor.addEventListener('mouseout', previewAnchorMouseOut);

				anchors[n].parentElement.appendChild(previewAnchor);

				// Add the file extension to the table.
				anchors[n].parentElement.nextElementSibling.innerHTML = anchors[n].href.replace(/.*(mp4|avi)/i, '$1');

				// Format the file size column.
				anchors[n].parentElement.nextElementSibling.nextElementSibling.innerHTML = (+anchors[n].parentElement.nextElementSibling.nextElementSibling.innerHTML).toLocaleString('en-US') +" <a href='http://superuser.com/questions/938234/size-of-files-in-windows-os-its-kb-or-kb?answertab=votes#answer-938259'>KB</a>";

			} else if (g_folderslistStr) {

				if (g_uponepath == "/video") {

					// Is it on the page where the hours of the day folders are located?

					anchors[n].innerHTML = anchors[n].innerHTML.replace(/(\d\d)/, function (x, h) {
						h = +h;
						var parsedHour = parseHour(h);

						return ((h > 12 || !h) ? '<span style="color: rgb(120, 120, 120);">'+ h +'</span> ' : '')+ parsedHour.hour +' '+ parsedHour.amPM;
					});

				} else if (g_thispath == "/video") {

					// Is it on the page where the date folders are located.

					dateAnchorsArray.push(anchors[n]);
				}
			}
		}

		// Sort the dates on the date page.
		var d = dateAnchorsArray.map(function (elem) {

			return {
				innerHTML: elem.innerHTML,
				tr_outerHTML: elem.parentElement.parentElement.outerHTML
			};
		});

		d.sort(function (elem1, elem2) {

			return elem1.innerHTML > elem2.innerHTML; // <-Sort the dates (innerHTML should be a 8 digit number).

		}).forEach(function (elem, index) {

			dateAnchorsArray[index].parentElement.parentElement.outerHTML = elem.tr_outerHTML.replace(/(\d{4})(\d{2})(\d{2})</, function (a,b,c,d) {

				return new Date(b +'/'+ c +'/'+ d).toDateString() + '<'; // <- Format the date so it looks normal.
			});			
		});
	}

	function previewAnchorMouseOver(arg_e) {
		var el = arg_e.srcElement || arg_e.target;
		var rect = el.getBoundingClientRect();
		var howFarRight = 90;
		var howFarUp = -50;
		var pos = {
			x: (rect.left + (window.scrollX || document.documentElement.scrollLeft)) + howFarRight,
			y: (rect.top + (window.scrollY  || document.documentElement.scrollTop))  + howFarUp,
		};

		// Find any old previews and remove them from the dom.
		var previews = document.querySelectorAll('.preview');

		for (var n = 0; n < previews.length; n++) {

			previews[n].srcAnchor.previewData.deletePreview();
		}

		el.timeout = setTimeout(function () {
			var img = document.createElement('img');
			img.style.width = 'inherit';
			img.style.height = 'inherit';
			img.src = el.href;
			img.srcAnchor = el;
			img.onload = previewImgOnload;
			img.onerror = previewImgOnload;

			var arrow = document.createElement('div');
			arrow.style.position = 'absolute';
			arrow.style.top = pos.y + 50 + 'px';
			arrow.style.left = pos.x + -5 + 'px';
			arrow.style.borderRight = "5px solid rgb(255, 111, 0)";
			arrow.style.borderLeft = "0px solid transparent";
			arrow.style.borderTop = "7px solid transparent";
			arrow.style.borderBottom = "7px solid transparent";
			arrow.style.display = (previewAnchorMouseOver.imgWidth) ? '' : 'none';

			var container = document.createElement('div');
			container.className = 'preview';

			container.style.position = 'absolute';
			container.style.top = pos.y + 'px';
			container.style.left = pos.x + 'px';
			container.style.width = (previewAnchorMouseOver.imgWidth || 'auto') + 'px';
			container.style.height = (previewAnchorMouseOver.imgHeight || 'auto') + 'px';
			container.style.border = '2px solid rgb(255, 111, 0)';
			container.style.backgroundColor = 'rgb(255, 111, 0)';
			container.style.borderRadius = '3px';
			container.style.display = (previewAnchorMouseOver.imgWidth) ? '' : 'none';
			container.style.overflow = 'hidden';

			container.srcAnchor = el;

			container.addEventListener('mouseover', function () {

				clearTimeout(el.timeout);
			});

			container.addEventListener('mouseout', function (e) {
				var elp = e.srcElement || e.target;

				if (elp === img || e.relatedTarget === img) {

					return;
				}

				el.previewData.deletePreview();
			});

			container.appendChild(img);

			img.container = container;

			el.previewData.previewImg = container;
			el.previewData.previewArrow = arrow;

			el.previewData.deletePreview = function () {

				el.previewData.previewImg.parentElement.removeChild(el.previewData.previewImg);
				el.previewData.previewArrow.parentElement.removeChild(el.previewData.previewArrow);
				el.previewData.previewImg = false;
			};

			document.body.appendChild(container);
			document.body.appendChild(el.previewData.previewArrow);
		}, 400);
	}

	function previewAnchorMouseOut(arg_e) {
		var el = arg_e.srcElement || arg_e.target;

		clearTimeout(el.timeout);

		el.timeout = setTimeout(function () {

			if (el.previewData.previewImg) {

				el.previewData.deletePreview();
			}
		}, 600);
	}

	function previewImgOnload(arg_e) {
		var img = arg_e.srcElement || arg_e.target;
		var rect = img.getBoundingClientRect();

		if ((rect.width / rect.height) < ((4 / 3) + 0.3)) {

			previewAnchorMouseOver.imgWidth = 400;
			previewAnchorMouseOver.imgHeight = previewAnchorMouseOver.imgWidth / (4 / 3);

		} else {

			previewAnchorMouseOver.imgWidth = 450;
			previewAnchorMouseOver.imgHeight = previewAnchorMouseOver.imgWidth / (16 / 9);
		}

		img.srcAnchor.previewData.previewImg.style.width  = previewAnchorMouseOver.imgWidth + 'px';
		img.srcAnchor.previewData.previewImg.style.height = previewAnchorMouseOver.imgHeight + 'px';
		img.srcAnchor.previewData.previewImg.style.display = '';

		img.srcAnchor.previewData.previewArrow.style.display = '';

		makeZoomable(img);
	}

	function makeZoomable(arg_img) {
		var mousewheelevt = (/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel";

		arg_img.addEventListener(mousewheelevt, zoomAndPan);
		arg_img.addEventListener('mousedown', mouseDown);

		arg_img.zoomPanData = {
			tempTransformString: '',
			startPan: {
				x: 0,
				y: 0
			},
			zoomOrigin: {
				x: (arg_img.offsetWidth * 0.5),
				y: (arg_img.offsetHeight * 0.5)
			}
		};

		function zoomAndPan(arg_e) {
			var evt = undefined; // <-- Needed for the mouse wheel delta (for other browsers not chrome).
			var delta = ((arg_e.wheelDelta) ? arg_e.wheelDelta : (evt = (window.event || arg_e), evt.detail * -120));
			var parentRect = this.container.getBoundingClientRect();
			var offsetClientX = arg_e.clientX - parentRect.left;
			var offsetClientY = arg_e.clientY - parentRect.top;
			var x = undefined;
			var y = undefined;

			arg_e.preventDefault(); // <-- Prevents scrolling of the page.

			if (delta >= 120) {// <-- Zoom in.

				x = (this.zoomPanData.zoomOrigin.x - offsetClientX) * 0.25;
				y = (this.zoomPanData.zoomOrigin.y - offsetClientY) * 0.25;

				this.zoomPanData.tempTransformString = 'translate(' + x + 'px,' + y + 'px) scale(1.25)' + this.zoomPanData.tempTransformString;

			} else if (delta <= -120) {// <-- Zoom out.

				x = ((this.zoomPanData.zoomOrigin.x - offsetClientX) * 0.20);
				y = ((this.zoomPanData.zoomOrigin.y - offsetClientY) * 0.20);

				this.zoomPanData.tempTransformString = 'translate(' + (0 - x) + 'px,' + (0 - y) + 'px) scale(.80)' + this.zoomPanData.tempTransformString;
			}

			this.style.transform = this.zoomPanData.tempTransformString;
		}

		// bindedPan ---> For the document listener, so that 'this' will point to the arg_img instead of document.
		// The function has to be cached somewhere so that it can be accessed and removed in the mouse up event.
		var bindedPan = pan.bind(arg_img);

		function pan(arg_e) {
			arg_e.preventDefault();

			this.style.transform = 'translate(' + (arg_e.clientX - this.zoomPanData.startPan.x) + 'px,' + (arg_e.clientY - this.zoomPanData.startPan.y) + 'px)' + this.zoomPanData.tempTransformString;

			return false;
		}

		function mouseDown(arg_e) {
			arg_e.preventDefault();

			this.zoomPanData.startPan.x = arg_e.clientX;
			this.zoomPanData.startPan.y = arg_e.clientY;

			this.style.transition = '';

			document.addEventListener('mousemove', bindedPan);
			document.addEventListener('mouseup', mouseUp);
		}

		function mouseUp(arg_e) {
			arg_e.preventDefault();

			document.removeEventListener('mousemove', bindedPan);
			document.removeEventListener('mouseup', mouseUp);

			var x = (arg_e.clientX - arg_img.zoomPanData.startPan.x);
			var y = (arg_e.clientY - arg_img.zoomPanData.startPan.y);

			arg_img.zoomPanData.tempTransformString = 'translate(' + x + 'px,' + y + 'px)' + arg_img.zoomPanData.tempTransformString;
		}
	}

	function downloadSelected() {
		var delay = undefined;
		var calculatedDelay = 0;
		var selectedVideos_checkboxes = [].slice.call(document.querySelectorAll('input[type=checkbox]:checked'));

		if (selectedVideos_checkboxes.length > 0) {

			delay = prompt('How many seconds between downloads?', '30');

		} else {

			alert('\n    No videos selected.\n');	

			return;
		}

		if (parseInt(delay) === NaN) {

			alert('Time is incorrect.');

			downloadSelected();

			return;

		} else if (delay === null) {

			// They must have canceled out of it.

			return; 
		}

		delay = parseInt(delay);

		delay = ((delay < 0.5)? 0.5: delay) * 1000; // Make sure the delay is atleast 0.5 seconds (500 milliseconds).

		selectedVideos_checkboxes.forEach(function (elem_checkbox) {
			var tr = elem_checkbox.parentElement.parentElement;

			if (elem_checkbox.checked && elem_checkbox.previousSibling && elem_checkbox.previousSibling.value) {

				setTimeout(function clickTheAnchorToStartDownload(p_elem_checkbox) {
					var xmlhttp = new XMLHttpRequest();
					var address = 'cgi-bin/sddownload.cgi?file=' + p_elem_checkbox.previousSibling.value;

					xmlhttp.onreadystatechange = function() {

						if (xmlhttp.readyState == 4 ) {
							if (xmlhttp.status == 200) {
								// Make a "HEAD" request just to see if the file exists.
								// Then click the anchor and download the file if a 200 status is returned.

								// Creating a iframe seems to be more reliable than creating an anchor and using anchor.click();
								var iframe = document.createElement('iframe');
								iframe.src = address;
								iframe.style.display = 'none';

								document.body.appendChild(iframe);

								setTimeout(function(p_iframe) { 

									// Clean up the DOM by removing the frame.							
									p_iframe.parentElement.removeChild(p_iframe); 
								}, 5000, iframe);

								p_elem_checkbox.checked = false;
							}
						}
					};
					xmlhttp.open("HEAD", address, true);
					xmlhttp.send();

				}, calculatedDelay, elem_checkbox);

				setTimeout(function animatedTableRowFadeInEffect(p_calculatedDelay) {
					var transitionDelay = (p_calculatedDelay === 0)? 0: ((delay < 5000)? delay: 5000);

					tr.style.transition = 'background-color '+ transitionDelay +'ms cubic-bezier(0.25, 0.1, 1, 0.05)';
					tr.style.backgroundColor = 'rgba(255, 111, 0, 0.3)';

				}, calculatedDelay - ((delay < 5000)? delay: 5000), calculatedDelay);

				calculatedDelay = calculatedDelay + delay;
			}
		});
	}

	var findVideoOnCamera = {};

	findVideoOnCamera.init = function(p_videoNameString) {
		var dateTimeRegEx = /(\d{8})_(\d{6})/;
		this.dateTimeRegEx = dateTimeRegEx;

		if (!p_videoNameString) {

			return false;
		}

		if (!p_videoNameString.match(dateTimeRegEx) || !p_videoNameString.match(dateTimeRegEx)[2]) {

			alert('Filename not correct.');

			return false;
		}

		this.day = p_videoNameString.match(dateTimeRegEx)[1];
		this.hour = p_videoNameString.match(dateTimeRegEx)[2].match(/(\d\d)/)[1];
		this.hourMinuteSecond = parseInt(p_videoNameString.match(dateTimeRegEx)[2]);

		this.pageNumber = 1;

		this.wasOnPreviousPage = false;

		this.goToFolder();
	}

	findVideoOnCamera.goToFolder = function () {
		var that = this;

		var watcher = watchVar.watch(window, 'g_lockLink', function (state) {

			if (!state) {

				watchVar.unWatch(window, 'g_lockLink', watcher);

				that.findVideoAnchor();
			}
		});

		ChangeContent('cgi-bin/sdlist.cgi?path=/video/'+ this.day + '/'+ this.hour + "&page="+ this.pageNumber);
	}

	findVideoOnCamera.findVideoAnchor = function () {
		var videosArray = (Array.prototype.slice.call(document.querySelectorAll('a'))).filter(function (elem) { return /mp4|avi/.test(elem); });
		var elem = undefined;
		var n = -1;

		if (g_thispage != this.pageNumber) {

			alert('\n\nCould not find video.\n\n');

			return;
		}

		if (this.wasOnPreviousPage) { // Went one page too far, and backtracked to previous page.

			this.doTheHighlight(videosArray[videosArray.length - 1]); // Highlight last video on this page.

			return;
		}

		while (++n < videosArray.length) {

			elem = videosArray[n].href.match(this.dateTimeRegEx);

			if (elem && elem[2] && parseInt(elem[2]) >= this.hourMinuteSecond) {

				elem = (+elem[2] == this.hourMinuteSecond)? videosArray[n]: videosArray[n-1];

				if (n === 0 && !elem && this.pageNumber > 1) {

					this.wasOnPreviousPage = true;

					this.pageNumber = this.pageNumber - 1;

					this.goToFolder();

				} else if (n === 0 && !elem && this.pageNumber === 1) {

					alert('\n\n Could not find video.\n\n It could be in the previous hour,\n or it could have been deleted.\n\n');

				} else {

					this.doTheHighlight(elem);
				}

				return;
			}
		}

		if (this.pageNumber === g_totalpage) {

			this.doTheHighlight(videosArray[n-1]); // Must be the last video.

		} else {

			// Didn't find it on that page so go to the next page.
			// Maybe this should be a callback instead of hard coded.
			this.pageNumber = this.pageNumber + 1;

			this.goToFolder();
		}
	}

	findVideoOnCamera.doTheHighlight = function (p_elem) {

		location.hash = '';

		p_elem.style.color = 'green';

		if (p_elem.nextElementSibling
			&& p_elem.nextElementSibling.onmouseover
			&& p_elem.nextElementSibling.href
			&& p_elem.nextElementSibling.href.indexOf('jpg') >= 0) {

			p_elem.nextElementSibling.onmouseover({ target: p_elem.nextElementSibling });
		}

		p_elem.scrollIntoView();
	}

	// WARNING: THIS WILL BE DIFFERENT FOR EVERYBODY!
	// Mine is currently set at 20mb videos, should autodetect that somehow.
	function isCorruptVideo(p_fileAnchor) {
		var fileName = p_fileAnchor.href.match(/.*\/(.*)$/) && p_fileAnchor.href.match(/.*\/(.*)$/)[1];

		if (fileName) {
			var regEx = new RegExp(fileName +';.*?;.*?;(.*?);');
			var sizeInBytes = g_filelistStr.match(regEx) && g_filelistStr.match(regEx)[1];
		}

		if (sizeInBytes) {

			return sizeInBytes < 20480; // 2048KB === 20MB

		} else {

			return true;
		}
	}

	// This function updates the current working path of the sd card. It shows where in the sd card file system you are.
	function updateSDCardPath() {
		var mainContentTDs = document.getElementById('maincontent').querySelectorAll('td');

		var changeContentStart = "javascript:ChangeContent('cgi-bin/sdlist.cgi?path=";
		var changeContentEnd   = "&page=1')";

		var rootAnchor  = '<a href="'+ changeContentStart + changeContentEnd +'">root</a>';
		var videoAnchor = '<a href="'+ changeContentStart +'/Video'+ changeContentEnd +'">video</a>';

		var backSlash = '\\';

		var newPath = rootAnchor + backSlash + videoAnchor; // 'root\video'

		for (var n = 0; n < mainContentTDs.length; n++) {

			if (/\/video/.test(mainContentTDs[n].innerHTML)) {

				mainContentTDs[n].innerHTML = mainContentTDs[n].innerHTML.replace(/\/video\/?(\d*)\/?(\d*)/i, function (match, date, hour) {

					if (hour) {

						hour = parseInt(hour);

						var dateAnchor  = '<a href="'+ changeContentStart +'/video/'+ date + changeContentEnd +'">'+ date +'</a>';

						var parsedHour = parseHour(hour);

						// 'root\video\20160407\(13)1pm' <- example of what it will return.
						newPath += backSlash + dateAnchor + backSlash
							+ ((hour > 12 || !hour)? ('<span style="color: rgb(84, 84, 84);">('+ hour +')</span>'): '') // Add 24 hour time in grey and parenthesis if needed.
							+ (parsedHour.hour + parsedHour.amPM);

					} else if (date) { // Check for date after checking for hour or this won't work correctly.

						// 'root\video\20160304' <- example of what it will return.
						newPath += backSlash + date;
					}

					return newPath;
				});

				mainContentTDs[n].width = 4000;

				break;
			}
		}
	}

	// WARNING: THIS WILL BE DIFFERENT FOR EVERYBODY!
	// Mine is currently set at 20mb videos, should autodetect that somehow.
	function isCorruptVideo(p_fileAnchor) {
		var fileName = p_fileAnchor.href.match(/.*\/(.*)$/) && p_fileAnchor.href.match(/.*\/(.*)$/)[1];

		if (fileName) {
			var regEx = new RegExp(fileName +';.*?;.*?;(.*?);');
			var sizeInBytes = g_filelistStr.match(regEx) && g_filelistStr.match(regEx)[1];
		}

		if (sizeInBytes) {

			return sizeInBytes < 20480; // 2048KB === 20MB

		} else {

			return true;
		}
	}

	function isOnSDCardMenu() {

		return g_backList[g_backList.length - 1] === "setup_sdlist.htm";
	}

	function parseHour(hour) {
		hour = +hour;

		return {
			hour: (hour % 12) ? (hour % 12) : 12,
			amPM: (hour < 12) ? 'AM' : 'PM'
		};
	}
}

function downloadAll() {

	var g_brokenLinks = [];

	var g_dataObj = { numberOfVideosClicked: 0 };

	var g_FOLDER_OBJ = {
		2: { regEx: /\/\d{8}&/ },
		3: { regEx: /\/\d\d&/ },
		4: { regEx: /(mp4|avi|jpg)$/ },//regEx: /[mp4|avi]$/,
	};

	function parseLinksFromFolder(p_array, p_dontChangePage, p_callBack) {
		var noArray = null ;
		var IS_LAST_PAGE = g_thispage === g_totalpage;
		var FOLDER_LEVEL = g_thispath.split('/').length;

		if (!p_array) {

			p_array = getAnchorsArray(FOLDER_LEVEL);
		}

		if (!p_dontChangePage && !IS_LAST_PAGE && p_array.length === 0) {

			changeFolder(g_thispath, (g_thispage + 1), parseLinksFromFolder.bind(null , noArray, p_dontChangePage, p_callBack));

		} else if (p_array.length === 0 && (p_dontChangePage || IS_LAST_PAGE)) {

			setTimeout(function () {

				p_callBack();
			}, calcDelayMilliseconds('changeFolder'));

		} else if (g_filelistStr) {

			downloadVideosFromFolder(p_array, parseLinksFromFolder.bind(null , p_array, false, p_callBack), null, null);

		} else {
			var nextFoldersAnchor = p_array.shift();
			var nextFoldersPath = parseFolderPath(nextFoldersAnchor.href);

			changeFolder(nextFoldersPath, 1, // Navigate to a new folder.
						 parseLinksFromFolder.bind(null, noArray, false, // Parse the links from the folder.
												   changeFolder.bind(null, g_thispath, g_thispage, // Navigate back to the this folder.
																	 parseLinksFromFolder.bind(null, p_array, p_dontChangePage, p_callBack)))); // Go to the next element in the array, until the array is finished.
		}
	}

	function downloadVideosFromFolder(p_array, p_callBack, p_startTime, p_fileType) {

		p_startTime = p_startTime || { start: null };

		if (!p_array || p_array.length === 0) {

			p_callBack();

			return;

		} else if ((calcDelayMilliseconds("video") && !p_startTime.start) || (calcDelayMilliseconds(p_fileType) + p_startTime.start) < Date.now()) {

			// calcDelayMilliseconds() is used as a short circuit to stop all downloads if it encouters a problem. It's a hack.

			var fileAnchor = p_array.shift();
			var fileName = fileAnchor.href.match(/\/\d\d\/(.*?(\.mp4|\.avi|\.jpg))$/i) && fileAnchor.href.match(/\/\d\d\/(.*?(\.mp4|\.avi|\.jpg))$/i)[1];
			var fileIsVideo = /\.mp4|\.avi/i.test(fileName);

			p_fileType = (fileIsVideo? "video": "image");

			p_startTime.start = 999999999999;

			var xmlhttp = new XMLHttpRequest();
			xmlhttp.onreadystatechange = function() {

				if (xmlhttp.readyState == 4 ) {

					if (xmlhttp.status == 200) {
						// Make a "HEAD" request just to see if the file exists.
						// Then click the anchor and download the file if a 200 status is returned.

						fileAnchor.style.color = 'green';

						// Was using "fileAnchor.click()" but when the sliders are slid back and forth the file download will be canceled
						// for some unknown reason.
						var iframe = document.createElement('iframe');
						iframe.src = fileAnchor.href;
						iframe.style.display = 'none';

						document.body.appendChild(iframe);

						setTimeout(function(p_iframe) { 

							// Clean up the DOM by removing the frame.							
							p_iframe.parentElement.removeChild(p_iframe); 
						}, 5000, iframe);

						p_startTime.start = Date.now();
					} else {

						p_startTime.start = null;

						g_brokenLinks.push(fileAnchor.href);
					}
				}
			};
			xmlhttp.open("HEAD", fileAnchor.href, true);
			xmlhttp.send();

			recordData(fileAnchor.href);
			console.log("file:", fileName); // Don't delete this yet.

			//delay = (delay > 1000)? delay: 1000; // Make sure it's atleast 1000ms.	
		}

		setTimeoutApplyArguments(downloadVideosFromFolder, arguments, 500);
	}

	function calcDelayMilliseconds(p_fileType) {
		var changeFolderDelayInput = document.getElementById('change_folder_delay');
		var videoDelayInput = document.getElementById('video_download_delay');
		var imageDelayInput = document.getElementById('image_download_delay');
		var delay = undefined;

		switch (p_fileType) {
			case 'video': delay = parseInt(videoDelayInput.value) / 100 * 200000; break;
			case 'image': delay = parseInt(imageDelayInput.value) / 100 * 200000; break;
			case 'changeFolder': delay = parseInt(changeFolderDelayInput.value) / 100 * 200000; break;
		}

		delay = (delay > 1000)? delay: 1000; // Make sure it's atleast 1000ms.

		return delay;
	}

	function changeFolder(p_folderPath, p_pageNumber, p_callBack) {

		if ((g_thispath.toLowerCase() !== p_folderPath.toLowerCase()) || (parseInt(g_thispage) != parseInt(p_pageNumber))) {

			var watcher = watchVar.watch(window, 'g_lockLink', function (state) {

				if (!state) {

					watchVar.unWatch(window, 'g_lockLink', watcher);

					changeFolder(p_folderPath, p_pageNumber, p_callBack);
				}
			});

			ChangeContent('cgi-bin/sdlist.cgi?path=' + p_folderPath + '&page=' + p_pageNumber);

		} else {

			setTimeout(function () {

				p_callBack();
			}, calcDelayMilliseconds('changeFolder'));
		}
	}

	function getAnchorsArray(p_FOLDER_LEVEL) {
		var anchors = makeArray(document.getElementById('maincontent').querySelectorAll('a'));

		return anchors.filter(function (p_elem) {

			return g_FOLDER_OBJ[p_FOLDER_LEVEL].regEx.test(p_elem.href);
		});
	}

	function setTimeoutApplyArguments(p_funcToCall, p_args, p_delay) {

		setTimeout(function (args) {

			p_funcToCall.apply(null , args);
		}, p_delay, p_args);
	}

	function parseFolderPath(p_pathString) {

		return (p_pathString.match(/path=(\/.*?)&/) && p_pathString.match(/path=(\/.*?)&/)[1]);
	}

	function makeArray(p_list) {

		return Array.prototype.slice.call(p_list);
	}

	// Threw this in because it started downloading duplicates for some reason.
	// I suspect it was because of the screen saver or somehow the tab lost focus.
	function recordData(p_videoHref) {
		var t = parseFolderPath(CONTENT_PAGE_LAST).split('/');
		var videoName = p_videoHref && p_videoHref.match(/\/\d\d\/(.*?[mp4|avi|jpg])$/) && p_videoHref.match(/\/\d\d\/(.*?[mp4|avi|jpg])$/)[1];
		t.shift();

		if (t[0] && !g_dataObj[t[0]]) {

			// video or pictures
			g_dataObj[t[0]] = g_dataObj[t[0]] || {};
		}

		if (t[1] && !g_dataObj[t[1]]) {

			// date
			g_dataObj[t[0]][t[1]] = g_dataObj[t[0]][t[1]] || {};
		}

		if (t[2] && !g_dataObj[t[2]]) {

			// hour
			g_dataObj[t[0]][t[1]][t[2]] = g_dataObj[t[0]][t[1]][t[2]] || [];
		}

		if (t[2] && videoName) {

			// video name
			g_dataObj[t[0]][t[1]][t[2]].push(videoName);
		}

		g_dataObj.numberOfVideosClicked += 1;
	}

	function getSelectedFolders() {

		// Reset the broken links array.
		g_brokenLinks = [];

		var selected = makeArray(document.querySelectorAll('input[type=checkbox]'))
		.filter(function (p_elem) {

			if (p_elem.checked && p_elem.previousSibling && p_elem.previousSibling.value) {

				return true;
			}

			return false;

		}).map(function (p_elem) {

			return p_elem.parentElement.parentElement.querySelector('a');
		});

		if (selected.length > 0) {

			if (!confirm('Instructions:\n\nThe script seems to run best when recording is turned off, the screen saver is turned off, '
						 + 'no unnecessary programs running and the browser tab is always in focus (aka front and center not "greyed" out). '
						 + 'The computer should not be used for anything else while the script is running. Otherwise it may skip some files '
						 + 'or download some files twice.\n\nMake sure the browser is configured to download files with out confirmation.\n\n'
						 + 'Just select the folders that you want to download and then press the download button.\n\n"Set it and forget it"\n')) {

				return;
			}

			g_dataObj.startTime = Date.now();

			modal.create(null );

			// Max download time is 200 seconds.
			var fileDownloadControlsForm = document.createElement('form');
			fileDownloadControlsForm.innerHTML = 
				'<h1>SD Card Download Settings</h1>'
				+ '<table>'
				+   '<tbody>'
				+     '<tr>'
				+       '<td style="text-align: right;">Folder change delay:</td>'
				+       '<td> <input style="width: 200px; vertical-align: middle;" oninput="update_delay_vars()" type="range" id="change_folder_delay" value="'+ 2 +'"></td>'
				+       '<td id="change_folder_delay_info" style="width: 2.19em;">'+ 4 +'s</td>'
				+     '</tr>'
				+     '<tr>'
				+       '<td style="text-align: right;">Video download delay:</td>'
				+       '<td> <input style="width: 200px; vertical-align: middle;" oninput="update_delay_vars()" type="range" id="video_download_delay" value="'+ 15 +'"></td>'
				+       '<td id="video_download_delay_info" style="width: 2.19em;">'+ 30 +'s</td>'
				+     '</tr>'
				+     '<tr>'
				+       '<td style="text-align: right;">Image download delay:</td>'
				+       '<td> <input style="width: 200px; vertical-align: middle;" oninput="update_delay_vars()" type="range" id="image_download_delay" value="'+ 0 +'"></td>'
				+       '<td id="image_download_delay_info" style="width: 2.19em;">'+ 1 +'s</td>'
				+     '</tr>'
				+   '</tbody>'
				+ '</table>'
				+ '<input style="display: block; margin: 0px auto;" type="button" value="Quit" id="quit_downloads">';

			fileDownloadControlsForm.style.cssText = 'position: fixed; top: 10px; left: 10px; background: white; padding: 10px; border: 1px solid rgb(255, 111, 0);';

			modal.modalElement.appendChild(fileDownloadControlsForm);

			document.getElementById('quit_downloads').addEventListener('click',  downloadsFinished);

			window.update_delay_vars = function () {
				var changeFolderDelayInput = document.getElementById('change_folder_delay');
				var videoDelayInput = document.getElementById('video_download_delay');
				var imageDelayInput = document.getElementById('image_download_delay');

				var folderChangeDelay  = Math.round((parseInt(changeFolderDelayInput.value) / 100 * 200000 / 1000)) || 1;
				var videoDownloadDelay = Math.round((parseInt(videoDelayInput.value)        / 100 * 200000 / 1000)) || 1;
				var imageDownloadDelay = Math.round((parseInt(imageDelayInput.value)        / 100 * 200000 / 1000)) || 1;

				document.getElementById('change_folder_delay_info').innerText  = folderChangeDelay  +'s';
				document.getElementById('video_download_delay_info').innerText = videoDownloadDelay +'s';
				document.getElementById('image_download_delay_info').innerText = imageDownloadDelay +'s';
			};

			// Start the downloads.
			parseLinksFromFolder(selected, true, downloadsFinished);
		}
	}

	function downloadsFinished() {
		var date = new Date();

		g_dataObj.endTime = Date.now();

		downloadReport('DOWNLOAD REPORT--'+ date.toDateString() +"--"+ date.getHours() +":"+ date.getMinutes(), 
					   "Number of files attempted: "+ g_dataObj.numberOfVideosClicked +"\r\n"
					   + "Start time: "+ (new Date(g_dataObj.startTime)).getHours() +":"+ (new Date(g_dataObj.startTime)).getMinutes() +"\r\n"
					   + "End time: "+ (new Date(g_dataObj.endTime)).getHours() +":"+ (new Date(g_dataObj.endTime)).getMinutes() +"\r\n" + "\r\n"
					   + "These files were not downloaded for some reason (there may be others):" + "\r\n"
					   + g_brokenLinks.join("\r\n"));

		alert('\n\nFinished downloading files.\n*See console for more information.\n\n');

		modal.delete();

		// Display a table in devtools for debugging purposes.
		for (var n in g_dataObj.video) {

			console.group("Download data for: " + n);
			console.table(g_dataObj.video[n], ['length']);
			console.groupEnd();
		}

		console.log("=>", g_dataObj.numberOfVideosClicked, 'downloads took:', +((g_dataObj.endTime - g_dataObj.startTime) / 1000 / 60).toFixed(2), "minutes");

		console.log("=>", g_dataObj);
	}

	var modal = {
		modalElement: document.createElement('div'),
		create: function (p_cssText) {
			this.modalElement = document.createElement('div');

			this.modalElement.style.cssText = p_cssText || 'background: rgba(157, 192, 232, 0.3);position: fixed;top: 0px;right: 0px;width: 100%;height: 100%;';

			document.body.appendChild(this.modalElement);
		},
		delete: function () {

			this.modalElement.parentElement.removeChild(this.modalElement);
		}
	};

	function downloadReport(filename, text) {
		//http://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server
		var element = document.createElement('a');
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
		element.setAttribute('download', filename);

		element.style.display = 'none';
		document.body.appendChild(element);

		element.click();

		document.body.removeChild(element);
	}

	var downloadFoldersBtnObj = {
		id: 'downloadSelectedItems',
		getBtn: function() {

			return document.getElementById(this.id);
		},
		createBtn: function() {
			var downloadFoldersButton = document.getElementById('okBtn').cloneNode(true);

			downloadFoldersButton.value = 'Download Folders';
			downloadFoldersButton.id = this.id;
			downloadFoldersButton.onclick = getSelectedFolders;
			downloadFoldersButton.style.marginLeft = '10px';

			document.getElementById('okBtn').parentElement.appendChild(downloadFoldersButton);
		}
	};

	// Listen for changes to g_lockLink, when g_lockLink changes to "true", that indicates the main content is changing.
	// When g_lockLink changes to 'false', that means it is safe to rerun the script on the new table.
	watchVar.watch(window, 'g_lockLink', function (p_state) {

		if (!p_state && window.g_folderslistStr) {

			if (!downloadFoldersBtnObj.getBtn()) {

				downloadFoldersBtnObj.createBtn();
			}
		}
	});
} // <- End of downloadAll function.

(function (html) {
	var scriptTag = document.createElement('script');

	scriptTag.id = 'DCS-2330l SD Card Menu UI Enhancer Module';
	scriptTag.innerHTML = html;

	document.head.appendChild(scriptTag);

})(['('+ varWatcher.toString()          +')()',
	'('+ downloadAll.toString()         +')()',
	'('+ main.toString() +')()',
   ].join(';\n\n'));
