import tmp from 'tmp';
import path from 'path';
import { spawn } from 'nexpect';

const NODE = process.execPath;
const NEON = path.resolve('bin/cli.js');

export function setup() {
  let tmpobj;

  beforeEach(function() {
    tmpobj = tmp.dirSync({ unsafeCleanup: true });

    this.cwd = tmpobj.name;
    this.spawn = (args) => spawn(NODE, [NEON].concat(args), { cwd: this.cwd });
  });

  afterEach(function() {
    delete this.cwd;
    delete this.spawn;

    tmpobj.removeCallback();
  });
};
