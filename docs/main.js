import { createApp } from './deps/vue.esm-browser.js'
import { exportWinCmd, renderTime } from './helpers.js'

window.addEventListener("beforeunload", function (e) {
	e.preventDefault();
	e.returnValue = "Are you sure you want to leave this page? Any unsaved work will be lost!";
});

let app = {
	el: "#app",
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
	setup() {
		return {
			renderTime
		}
	},
	methods: {
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
					videoRef: null, // Filled in later in `videoSetRef`
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
			let clipEndsWith = /^(.*#)(\d+)$/.exec(clip.name);
			let clipName = clipEndsWith ? clipEndsWith[1] + (parseInt(clipEndsWith[2]) + 1) : clip.name + " #2";

			let newClip = {
				key: this.nextKey++,
				name: clipName,
				startTime: 0,
				currentTime: clip.currentTime,
				endTime: 0,
				startTimePresent: false,
				endTimePresent: false,
				url: clip.url,
				videoRef: null, // Filled in later in `videoSetRef`
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
			let textArea = document.createElement("textarea");
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

createApp(app).mount("#app");
