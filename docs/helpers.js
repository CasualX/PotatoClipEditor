/**
 * Renders a video's time (seconds) in the format [hh:]mm:ss.fff
 * @param {number} seconds
 */
export function renderTime(seconds) {
	let msecs = Math.floor((seconds - Math.floor(seconds)) * 1000);
	let secs = Math.floor(seconds % 60);
	let mins = Math.floor(seconds / 60) % 60;
	let hours = Math.floor(seconds / 3600);
	let tail = secs.toString().padStart(2, "0") + "." + msecs.toString().padStart(3, "0");
	return hours == 0 ? "" + mins + ":" + tail : "" + hours + ":" + mins.toString().padStart(2, "0") + ":" + tail;
}

/**
 * Escapes and quotes the argument according to ffmpeg's rules:
 * https://www.ffmpeg.org/ffmpeg-utils.html#Quoting-and-escaping
 * @param {string} s 
 */
export function quoteFfmpeg(s) {
	let pieces = s.split("'");
	if (pieces.length > 1) {
		s = "";
		for (let i = 0; i < pieces.length; i += 1) {
			if (i != 0) {
				s += "'\\''";
			}
			s += pieces[i];
		}
	}
	return "'" + s + "'";
}

/**
 * Exports ffmpeg commands as a batch script for Windows
 * @param {{
 * 	key: number
 * 	name: string
 * 	startTime: number
 * 	currentTime: number
 * 	endTime: number
 * 	startTimePresent: boolean
 * 	endTimePresent: boolean
 * 	url: string
 * 	videoRef: HTMLVideoElement
 *  }[] } clips
 *  @param {{
 * show: boolean
 * filename: string
 * ffmpeg: string
 * codec: string
 * cleanup: boolean
 * }} options
 */
export function exportWinCmd(clips, options) {
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
		let ss = clip.startTimePresent ? ` -ss ${renderTime(clip.startTime)}` : "";
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

/**
 * Escapes cmd.exe argument strings containing double quotes
 * @param {string} s 
 */
 function escapeCmd(s) {
	// If string is already quoted assume it is already escaped and just return it
	if (/^"(.*)"$/s.test(s)) {
		return s;
	}
	return '"' + s.replace('"', '^"') + '"';
}
