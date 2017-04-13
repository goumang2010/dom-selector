require("babel-register");
const fs = require('fs');
const jsbeautify = require('js-beautify').js;
const path = require('path');
const babel = require('rollup-plugin-babel');
const eslint = require('rollup-plugin-eslint');
const commonjs = require('rollup-plugin-commonjs');
const nodeResolve = require('rollup-plugin-node-resolve');
const moment = require('moment');
const rollup = require('rollup');
const uglify = require('uglify-js');
const chalk = require('chalk');
const format = require('util').format;
const ora = require('ora');
const inquirer = require('inquirer');
var banner = '';
var normalCode = '';
var prefix = '   dom-css-selector';
var sep = chalk.gray('·');
var pkgPath = path.join(__dirname, './package.json');
var versionFlag = 'version';
var version = getPkgField(versionFlag);
var spinner;
const config = {
	paths: {
		distPath(prefix ='') {
			return path.join(__dirname, './dist/', prefix + 'selector.min.js');
		},
		rawPath(prefix ='') {
			return path.join(__dirname, './dist/', prefix + 'selector.js');
		}
	},
    babel: babel({
				babelrc: false,
				"presets": [
					["latest", {
						"es2015": {
							"modules": false
						}
					}]
				],
				"ignore": [
					"dist/*.js"
				],
				"plugins": [
					"external-helpers"
				],
				externalHelpers: true
			}),
	rollup: {
		entry: path.join(__dirname, './src/index.js'),
		plugins: [
			nodeResolve({
				browser: true
			}),
			commonjs(),
			eslint()
		]
	}
};
const logger = {
	log() {
		var msg = format.apply(format, arguments);
		console.log(chalk.white(prefix), sep, msg);
	},
	fatal() {
		if (message instanceof Error) message = message.message.trim();
		var msg = format.apply(format, arguments);
		console.error(chalk.red(prefix), sep, msg);
	},
	success() {
		var msg = format.apply(format, arguments);
		console.log(chalk.green(prefix), sep, msg);
	}
}
updateVersion(versionFlag, version)
	.then((newverson) => {
		spinner = ora(`building dom-selector ...`).start();
		version = newverson;
	})
	.then(() => build({ version }))
	.then((bundle) => bundle.map(x => x.code))
	.then((code) => output(code))
	.then(() => {
		spinner && spinner.stop();
		return { domSelector: version };
	})
	.catch(err => {
		spinner.stop();
		console.log(err);
        throw err;
	});

function updateVersion(versionFlag, version) {
	return inquirer
		.prompt([{
			type: 'input',
			name: 'version',
			message: `Which version for ${versionFlag}?`,
			default: version
		}])
		.then((answers) => {
			if (version !== answers.version) {
				version = answers.version;
				let spinner = ora(`Updating package.json ${versionFlag} to ${version} ...`).start();
				return setPkgField(versionFlag, version).then(() => {
					spinner.stop();
					logger.success(`Update package.json ${versionFlag} succeed.`);
					return version;
				});
			} else {
				return version;
			}
		});
}

function build({
	version = 'unknow',
	plugins = [],
	custom = {}
} = {}) {
	return Promise.resolve()
		.then(() => {
			banner = '/*\n' +
				` * dom-css-selector v` + `${version}, bundle: ${moment().format("YYYY-MM-DD HH:mm")}` + '\n' +
				' */';
            let option  = Object.assign({}, config.rollup, { plugins: [...config.rollup.plugins, ...plugins] })
            return Promise.all([rollup.rollup(option), rollup.rollup(Object.assign({}, option, { plugins: [...option.plugins, config.babel] }))]);
		})
		.then(function(bundles) {
            let [es6, es5] = bundles;
            let option = Object.assign({
				useStrict: false,
				banner: banner,
				format: 'umd',
				moduleName: 'selector'
			}, custom);
            return Promise.all([es5.generate(Object.assign({
                    useStrict: false,
                    banner: banner,
                    format: 'umd',
                    moduleName: 'selector'
                }, custom)), es5.generate(Object.assign({
                    useStrict: false,
                    banner: banner,
                    format: 'es',
                    moduleName: 'selector'
                }, custom)),es6.generate(Object.assign({
                    useStrict: false,
                    banner: banner,
                    format: 'es',
                    moduleName: 'selector'
                }, custom))]);
		})
        
        ;
};

function output(codes) {
    let [umd, es5, es6] = codes;
	return Promise.resolve().then(function() {
			return Promise.all([write(config.paths.rawPath(), umd), write(config.paths.rawPath('es5.'), es5), write(config.paths.rawPath('es6.'), es6)]);
		})
		.then(function() {
			return uglify.minify(umd, {
				fromString: true,
				compress: {
					screw_ie8: false,
					drop_console: true,
					passes: 2
				},
				mangle: {
					screw_ie8: false
				},
				output: {
					preamble: banner,
					screw_ie8: false,
					ascii_only: true
				}
			}).code;
		})
		.then(function(_code) {
			let minCode = _code;
			return write(config.paths.distPath(), minCode);
		});
};

function getSize(code) {
	return (code.length / 1024).toFixed(2) + 'kb';
};

function getPkgObj() {
	return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

function getPkgField(flag) {
	return getPkgObj()[flag];
}

function setPkgField(flag, value) {
	let obj = getPkgObj();
	obj[flag] = `${value}`;
	return new Promise((resolve, reject) => {
		fs.writeFile(pkgPath, jsbeautify(JSON.stringify(obj)), (err) => {
			if (err) {
				console.log(err);
				reject(err);
			}
			resolve(value);
		});
	});
}

function write(dest, code) {
	return new Promise(function(resolve, reject) {
		let spinner = ora(`Writing file to ${dest} ...`).start();
		fs.writeFile(dest, code, function(err) {
			if (err) return reject(err);
			spinner.stop();
			logger.success(`Write file to ${chalk.blue.bold(dest)} succeed, file size: ${chalk.blue.bold(getSize(code))}.`);
			resolve(code);
		});
	});
};
