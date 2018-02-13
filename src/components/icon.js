const html = require('choo/html')

export default function icon (progress, size = 128) {
  return html`
    <svg height=${size + 'px'} width=${size + 'px'} viewBox="0 0 24 24">
      <path stroke="null" id="svg_1" fill=${progress ? '#3367d6' : '#666666'} d="m21.884692,8.472682l-5.648395,0l0,-8.472593l-8.472593,0l0,8.472593l-5.648395,0l9.884692,9.884692l9.884692,-9.884692zm-21.181482,12.708889l0"/>
      <rect stroke="null" id="svg_2" fill="#666666" stroke-width="null" stroke-opacity="null" x="0.7" y="21.2" width="22.6" height="2.8"/>
      <rect stroke="null" id="svg_2" fill="#3367d6" stroke-width="null" stroke-opacity="null" x="0.7" y="21.2" width=${progress / (100 / 22.6)} height="2.8"/>
    </svg>
  `
}
