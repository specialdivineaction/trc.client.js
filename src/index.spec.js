const context = require.context('./', true, /\.ts$/);
context.keys().forEach(context);
