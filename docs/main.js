// import 'tailwindcss/tailwind.css';

window.addEventListener('beforeunload', function(e) {
	e.preventDefault();
	e.returnValue = "Are you sure you want to leave this page? Any unsaved work will be lost!";
});

function renderTime(time) {
	let msecs = Math.floor((time - Math.floor(time)) * 1000);
	let secs = Math.floor(time % 60);
	let mins = Math.floor(time / 60);
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
			// See `addClip` for the child object structure
			clips: [],
			// Export related options
			options: {
				show: false,
				name: "output.mp4",
				ffmpeg: "ffmpeg.exe",
				codec: "-vcodec h264 -acodec copy",
			},
		};
	},
	methods: {
		renderTime: renderTime,
		addClip(e) {
			let files = e.target.files;
			for (let i = 0; i < files.length; i += 1) {
				let file = files[i];
				let clip = {
					key: this.nextKey++,
					name: file.name,
					startTime: 0,
					currentTime: 0,
					endTime: 0,
					url: URL.createObjectURL(file),
					videoRef: null // Filled in later in `setVideoRef`
				};
				if (i == 0) {
					this.previewKey = clip.key;
				}
				this.clips.push(clip);
			}
		},
		setVideoRef(clip) {
			return videoRef => {
				clip.videoRef = videoRef;
			};
		},
		setMetadata(clip) {
			clip.endTime = clip.videoRef.duration;
			clip.videoRef.currentTime = clip.currentTime;
		},
		videoTimeUpdate(clip) {
			if (clip.videoRef) {
				clip.currentTime = clip.videoRef.currentTime;
			}
		},
		setStartTime(clip) {
			clip.startTime = clip.videoRef.currentTime;
			if (clip.startTime > clip.endTime) {
				clip.endTime = clip.videoRef.currentTime;
			}
		},
		setEndTime(clip) {
			clip.endTime = clip.videoRef.currentTime;
			if (clip.endTime < clip.startTime) {
				clip.startTime = clip.videoRef.currentTime;
			}
		},
		removeClip(key) {
			let index = this.clips.findIndex(clip => clip.key == key);
			// FIXME! Leaking object URL here...
			// Multiple clips can refer to the same object URL so they need to be reference counted
			this.clips.splice(index, 1);
			// If the current preview is the delete clip
			if (this.previewKey == key) {
				// Move the current preview to the next clip (if any)
				let nextKey = index < this.clips.length ? this.clips[index].key : index > 0 ? this.clips[index - 1].key : -1;
				this.selectPreview(nextKey);
			}
		},
		duplicateClip(key) {
			let index = this.clips.findIndex(clip => clip.key == key);
			let clip = this.clips[index];
			let newClip = {
				key: this.nextKey++,
				name: clip.name,
				startTime: clip.startTime,
				currentTime: clip.currentTime,
				endTime: clip.endTime,
				url: clip.url,
				videoRef: null // Filled in later in `setVideoRef`
			};
			this.clips.splice(index + 1, 0, newClip);
			this.selectPreview(newClip.key);
		},
		pauseAll() {
			for (let i = 0; i < this.clips.length; i += 1) {
				let clip = this.clips[i];
				if (clip.videoRef) {
					clip.videoRef.pause();
				}
			}
		},
		selectPreview(key) {
			if (key != this.previewKey) {
				// Pause all running video players when switching
				this.pauseAll();
				this.previewKey = key;
			}
		},
		copyCommand() {
			let textArea = this.$refs.exportTextArea;
			textArea.value = exportWinCmd(this.clips, this.options);
			textArea.select();
			try {
				document.execCommand("copy");
				alert("The processing commands were successfully copied to your clipboard!");
			}
			catch (ex) {
				console.error(ex);
				alert("There was an error copying the processing commands...")
			}
		},
	},
};
Vue.createApp(app).mount('#app');

// Escapes cmd.exe argument strings containing double quotes
function escapeCmd(s) {
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
	let cmd = `SET FFMPEG=${escapeCmd(options.ffmpeg)}\nMKDIR tmp\nTYPE NUL>tmp\\parts.txt\n`;
	for (let i = 0; i < clips.length; i += 1) {
		let clip = clips[i];
		cmd += `%FFMPEG% -i ${escapeCmd(clip.name)} ${options.codec} -ss ${renderTime(clip.startTime)} -to ${renderTime(clip.endTime)} "tmp\\part${i}.mp4"<NUL\n`;
		cmd += `ECHO file 'tmp/part${i}.mp4'>>tmp\\parts.txt\n`;
	}
	cmd += `%FFMPEG% -f concat -i "tmp\\parts.txt" -c copy ${escapeCmd(options.name)}<NUL\n`;
	cmd += "DEL /Q";
	for (let i = 0; i < clips.length; i += 1) {
		cmd += ` tmp\\part${i}.mp4`;
	}
	cmd += ` tmp\\parts.txt\nRMDIR tmp\n`;
	return cmd;
}
