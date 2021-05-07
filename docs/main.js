import 'tailwindcss/tailwind.css';

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
			clips: []
		};
	},
	methods: {
		renderTime(time) {
			let msecs = Math.floor((time - Math.floor(time)) * 1000);
			let secs = Math.floor(time % 60);
			let mins = Math.floor(time / 60);
			let hours = Math.floor(time / 3600);
			let tail = secs.toString().padStart(2, '0') + '.' + msecs.toString().padStart(3, '0');
			return hours == 0 ? '' + mins + ':' + tail : '' + hours + ':' + mins.toString().padStart(2, '0') + ':' + tail;
		},
		addClip(e) {
			let files = e.target.files;
			for (let i = 0; i < files.length; i += 1) {
				let file = files[i];
				let clip = {
					key: this.nextKey++,
					name: file.name,
					startTime: 0,
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
			// Move the current preview to the next clip (if any)
			if (index < this.clips.length) {
				this.previewKey = this.clips[index].key;
			} else if (index > 0) {
				this.previewKey = this.clips[index - 1].key;
			}
		},
		duplicateClip(key) {
			let index = this.clips.findIndex(clip => clip.key == key);
			let clip = this.clips[index];
			let newClip = {
				key: this.nextKey++,
				name: clip.name,
				startTime: clip.startTime,
				endTime: clip.endTime,
				url: clip.url,
				videoRef: null // Filled in later in `setVideoRef`
			};
			this.previewKey = newClip.key;
			this.clips.splice(index + 1, 0, newClip);
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
		}
	}
};
Vue.createApp(app).mount('#app');
