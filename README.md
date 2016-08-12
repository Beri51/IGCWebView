# IGC Web View

Glider pilots record their flights with electronic loggers which 
save GPS and barograph traces in International Gliding Commission 
(IGC) format. Recently, open source smartphone apps such as 
[XCSoar](http://www.xcsoar.org) have become available which are able 
to record an IGC flight log at a fraction of the cost of a dedicated 
logger, although these are not approved for use in competitions or 
badge claims.

Unfortunately the most popular software for viewing IGC files on a 
PC is commercial and rather expensive. Although some free programs 
exist, they are not always easy to set up and use. Furthermore, some 
IGC viewers require a lot of screen space and can be difficult to 
work with on laptops.

*IGC Web View* is an IGC viewer written in JavaScript and HTML 5, 
which is able to run in any modern Web browser. It draws the 
glider's flight path onto an interactive map, using the 
[Google Maps Javascript API](https://developers.google.com/maps/documentation/javascript/), and also plots a 
graph of altitude against time. The responsive layout adjusts itself 
to fit any screen size, from a large widescreen monitor to a small 
laptop or even a smartphone.

The application also makes some use of php, and a server side MySQL database containing data on controlled airspace.  The structure of this database is documented in the data_structure.txt file.

There is also a table containing turning point information, accessed via php.

Two further small php files are used for fetching elevation and timezone data from Google services.  These services require keys, as will the main [Google Maps API](https://developers.google.com/maps/documentation/javascript/).  For obvious reasons the keys used in production are not exposed here: you can obtain keys free of charge from the [Google Developers Console](https://console.developers.google.com/). Registration is required.

Apart from the above, sll processing takes place in client-side script, so there is no 
need to upload the IGC file (or anything else) to the server.



## Browser Support

The browser must support the JavaScript FileReader API, which is 
used to open files from the local hard drive. This API is available 
in most modern browsers, but not in Internet Explorer 9 or earlier 
versions.

*IGC Web View* has been tested in the following browsers:
* Firefox (Windows / Android / Linux)
* Internet Explorer 11
* Chrome (Windows / Android / Linux)

# Build instructions for developers

IGC Web View is built using [Webpack](https://webpack.github.io), which
combines all of the JavaScript source code files into a single bundle. This
reduces the page load time for end users by minimising the number of HTTP requests
needed to fetch the scripts. Webpack also provides a `require` directive which
enables script files to reference each other, allowing the code to be broken up
into distinct modules for easier maintenance.

## Prerequisites

First install [Node.js](https://nodejs.org), which is a JavaScript interpreter
that runs outside the browser. This is needed in order to run Webpack.

Note that many major Linux distributions (including Ubuntu) come with an
outdated version of Node. To get a more recent version, and receive regular
security updates, see: [Installing Node.js via package manager](https://nodejs.org/en/download/package-manager).

Node.js is also available for Windows and Mac OS X.

Once Node is installed, use the Node Package Manager to get Webpack:
```
npm install -g webpack
```
(On Linux systems, this command must be executed with root privileges.)

## Build process

Open a command prompt in the directory where you cloned the
Git repository and type:
```
npm install jquery
```
This will install the jquery library. 

You can then build IGCWebView for debugging simply by typing:
```
webpack
```

This will combine the JavaScript modules into a single file, `bundle.js`,
which is referenced by `index.html` but is deliberately excluded from source
control.

If you would like `webpack` to rerun automatically whenever one of the source
code files changes, open a separate terminal window and type:
```
webpack --watch
```

For production use, the JavaScript should ideally be minified (removing all white space)
in order to reduce its size. This can be achieved by running:
```
webpack -p
```
