#!/usr/bin/env node
'use strict';

require('../lib/index').startServer().catch(err => {
  console.error(err);
  process.exit(1);
});
