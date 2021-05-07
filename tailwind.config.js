const colors = require('tailwindcss/colors');

module.exports = {
	mode: 'jit',
	purge: ['./docs/index.html'],
	darkMode: false, // or 'media' or 'class'
	theme: {
		extend: {
			colors
		}
	},
	variants: {
		extend: {}
	},
	plugins: [require('@tailwindcss/forms'), require('@tailwindcss/aspect-ratio')]
};
