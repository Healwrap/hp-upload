const fs = require('fs')
const path = require('path')

function mkdirGuard(target) {
  try {
    fs.mkdirSync(target, { recursive: true })
  } catch (e) {
    mkdirp(target)

    function mkdirp(dir) {
      if (fs.existsSync(dir)) {
        return true
      }
      const dirname = path.dirname(dir)
      mkdirp(dirname)
      fs.mkdirSync(dir)
    }
  }
}

exports.mkdirGuard = mkdirGuard
