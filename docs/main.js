// import 'tailwindcss/tailwind.css';

window.addEventListener('beforeunload', function(e) {
	e.preventDefault();
	e.returnValue = "Are you sure you want to leave this page? Any unsaved work will be lost!";
});

function renderTime(time) {
	let msecs = Math.floor((time - Math.floor(time)) * 1000);
	let secs = Math.floor(time % 60);
	let mins = Math.floor(time / 60) % 60;
	let hours = Math.floor(time / 3600);
	let tail = secs.toString().padStart(2, '0') + '.' + msecs.toString().padStart(3, '0');
	return hours == 0 ? '' + mins + ':' + tail : '' + hours + ':' + mins.toString().padStart(2, '0') + ':' + tail;
}

let app = {
	el: '#app',
	data() {
		return {
			// Clip currently being previewed
			// If out of bounds then no preview is selected
			previewKey: 0,
			// Unique key for the next clip added
			nextKey: 0,
			// List of clips on the timeline
			// See `timelineAdd` for the child object structure
			clips: [],
			// Export related options
			options: {
				show: false,
				filename: "output.mp4",
				ffmpeg: "ffmpeg.exe",
				codec: "-vcodec h264 -acodec copy",
				cleanup: true,
			},
		};
	},
	methods: {
		renderTime: renderTime,
		timelineAdd(e) {
			let files = e.target.files;
			for (let i = 0; i < files.length; i += 1) {
				let file = files[i];
				let clip = {
					key: this.nextKey++,
					name: file.name,
					startTime: 0,
					currentTime: 0,
					endTime: 0,
					startTimePresent: false,
					endTimePresent: false,
					url: URL.createObjectURL(file),
					videoRef: null // Filled in later in `videoSetRef`
				};
				if (i == 0) {
					this.previewKey = clip.key;
				}
				this.clips.push(clip);
			}
			e.target.value = null;
		},
		timelineRemove(key) {
			let index = this.clips.findIndex(clip => clip.key == key);
			// FIXME! Leaking object URL here...
			// Multiple clips can refer to the same object URL so they need to be reference counted
			this.clips.splice(index, 1);
			// If the current preview is the delete clip
			if (this.previewKey == key) {
				// Move the current preview to the next clip (if any)
				let nextKey = index < this.clips.length ? this.clips[index].key : index > 0 ? this.clips[index - 1].key : -1;
				this.timelinePreview(nextKey);
			}
		},
		timelineClone(key) {
			let index = this.clips.findIndex(clip => clip.key == key);
			let clip = this.clips[index];
			let newClip = {
				key: this.nextKey++,
				name: clip.name,
				startTime: 0,
				currentTime: clip.currentTime,
				endTime: 0,
				startTimePresent: false,
				endTimePresent: false,
				url: clip.url,
				videoRef: null // Filled in later in `videoSetRef`
			};
			this.clips.splice(index + 1, 0, newClip);
			this.timelinePreview(newClip.key);
		},
		timelinePreview(key) {
			if (key != this.previewKey) {
				// Pause all running video players when switching
				this.pauseAll();
				this.previewKey = key;
			}
			// Rewind the player to the start of the clip
			let clip = this.clips.find(clip => clip.key == key);
			if (clip && clip.videoRef) {
				clip.videoRef.currentTime = clip.startTime;
			}
		},
		videoSetRef(clip) {
			return videoRef => {
				clip.videoRef = videoRef;
			};
		},
		videoLoadedMetadata(clip) {
			if (clip.endTime == 0.0) {
				clip.endTime = clip.videoRef.duration;
			}
			clip.videoRef.currentTime = clip.currentTime;
		},
		videoTimeUpdate(clip) {
			if (clip.videoRef) {
				// Pause the video when the end of the clip is reached
				if (clip.currentTime < clip.endTime && clip.videoRef.currentTime >= clip.endTime) {
					clip.videoRef.pause();
				}
				clip.currentTime = clip.videoRef.currentTime;
			}
		},
		setStartTime(clip) {
			clip.startTime = clip.videoRef.currentTime;
			clip.startTimePresent = clip.startTime != 0.0;
			if (clip.startTime > clip.endTime) {
				clip.endTime = clip.videoRef.currentTime;
			}
		},
		setEndTime(clip) {
			clip.endTime = clip.videoRef.currentTime;
			clip.endTimePresent = clip.endTime != clip.videoRef.duration;
			if (clip.endTime < clip.startTime) {
				clip.startTime = clip.videoRef.currentTime;
			}
		},
		pauseAll() {
			for (let i = 0; i < this.clips.length; i += 1) {
				let clip = this.clips[i];
				if (clip.videoRef) {
					clip.videoRef.pause();
				}
			}
		},
		startExport() {
			this.pauseAll();
			this.options.show = true;

			// Remember settings from localStorage
			try {
				this.options.ffmpeg = localStorage.getItem("PCE/" + "ffmpeg") ?? this.options.ffmpeg;
				this.options.codec = localStorage.getItem("PCE/" + "codec") ?? this.options.codec;
				this.options.filename = localStorage.getItem("PCE/" + "filename") ?? this.options.filename;
				this.options.cleanup = localStorage.getItem("PCE/" + "cleanup") ?? this.options.cleanup;
			}
			catch (ex) {
				console.error(ex);
			}
		},
		saveOption(variable) {
			try {
				localStorage.setItem("PCE/" + variable, this.options[variable]);
			}
			catch (ex) {
				console.error(ex);
			}
		},
		copyCommand() {
			let textArea = document.createElement('textarea');
			textArea.value = exportWinCmd(this.clips, this.options);
			document.body.appendChild(textArea);
			textArea.select();
			let success;
			try {
				document.execCommand("copy");
				success = true;
			}
			catch (ex) {
				console.error(ex);
				success = false;
			}
			document.body.removeChild(textArea);
			if (success) {
				alert("The processing commands were successfully copied to your clipboard!");
			}
			else {
				alert("There was an error copying the processing commands...");
			}
		},
	},
};
Vue.createApp(app).mount('#app');

// Escapes cmd.exe argument strings containing double quotes
function escapeCmd(s) {
	// If string is already quoted assume it is already escaped and just return it
	if (/^"(.*)"$/s.test(s)) {
		return s;
	}
	return "\"" + s.replace("\"", "^\"") + "\"";
}

// Escapes and quotes the argument according to ffmpeg's rules:
// https://www.ffmpeg.org/ffmpeg-utils.html#Quoting-and-escaping
function quoteFfmpeg(s) {
	let pieces = s.split("\'");
	if (pieces.length > 1) {
		s = "";
		for (let i = 0; i < pieces.length; i += 1) {
			if (i != 0) {
				s += "'\\''";
			}
			s += pieces[i];
		}
	}
	return "\'" + s + "\'";
}

function exportWinCmd(clips, options) {
	let ffmpeg = escapeCmd(options.ffmpeg);
	let filename = escapeCmd(options.filename);
	if (clips.length == 1) {
		let clip = clips[0];
		let ss = clip.startTimePresent ? ` -ss ${renderTime(clip.startTime)}` : "";
		let to = clip.endTimePresent ? ` -to ${renderTime(clip.endTime)}` : "";
		return `${ffmpeg} -i ${escapeCmd(clip.name)} ${options.codec}${ss}${to} ${filename}\n`;
	}
	let tmp = "tmp" + Math.random().toString(16).slice(2);
	let cmd = `MKDIR ${tmp}\nTYPE NUL>"${tmp}\\parts.txt"\n`;
	for (let i = 0; i < clips.length; i += 1) {
		let clip = clips[i];
		let ss = clip.startTimePresent ? ` -ss ${renderTime(clip.startTime)}`: "";
		let to = clip.endTimePresent ? ` -to ${renderTime(clip.endTime)}` : "";
		cmd += `${ffmpeg} -i ${escapeCmd(clip.name)} ${options.codec}${ss}${to} "${tmp}\\part${i}.mp4"<NUL\n`;
		cmd += `ECHO file 'part${i}.mp4'>>"${tmp}\\parts.txt"\n`;
	}
	cmd += `${ffmpeg} -f concat -i "${tmp}\\parts.txt" -c copy ${filename}<NUL\n`;
	if (options.cleanup) {
		cmd += "DEL /Q";
		for (let i = 0; i < clips.length; i += 1) {
			cmd += ` "${tmp}\\part${i}.mp4"`;
		}
		cmd += ` "${tmp}\\parts.txt"\nRMDIR ${tmp}\n`;
	}
	return cmd;
}
