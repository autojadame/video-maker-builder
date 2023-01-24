const { spawn } = require('child_process');

 const detectGPUBrand = () => {
    if (process.platform === 'win32') {
        return new Promise((resolve, reject) => {
            let proc = spawn('wmic', ['path', 'Win32_VideoController', 'get', 'name']);

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                stdout += data;
            });

            proc.stderr.on('data', (data) => {
                stderr += data;
            });

            proc.on('close', (code) => {
              console.log(code)
              console.log(stdout)

                if (code === 0) {
                    let result = stdout.split('\n');
                    let gpuBrand;

                    result.forEach((line) => {
                        if (!line.includes('Name') && line.length > 4) {
                            // parse the gpu brand name from the result
                            gpuBrand = line.trim();
                        }
                    });

                    resolve(gpuBrand);
                }
                else {
                    reject(stderr);
                }
            });
        });
    }
    else if (process.platform === 'linux') {
        return new Promise((resolve, reject) => {
            let proc = spawn('lspci');

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                stdout += data;
            });

            proc.stderr.on('data', (data) => {
                stderr += data;
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    let result = stdout.split('\n');
                    let gpuBrand;

                    result.forEach((line) => {
                        if (line.includes('VGA')) {
                            // parse the gpu brand name from the result
                            gpuBrand = line.split(':')[1].trim();
                        }
                    });

                    resolve(gpuBrand);
                }
                else {
                    reject(stderr);
                }
            });
        });
    }
    else{
      throw new Error("SO not supported")
    }
}

module.exports = detectGPUBrand
