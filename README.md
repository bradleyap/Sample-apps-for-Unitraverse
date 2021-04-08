# Sample-apps-for-Unitraverse

There are quite a few applet views already in this repo as you may have noticed if you checked under the 'js' directory here. Each of these can help you write your own applets and are posted here for that purpose. Additionally, I'll try to create more video walk-throughs and add links to these video demonstrations here, as this will give you a good idea about the high level effect of what the code does.

## Using the 'addOns.js' file

Where sample applets differ from the built-ins is that in order to use them in a vault, the 'addOns.js' must be updated with information about the sample applet. Some of the keys in the add-ons file are self-explanatory but others are probably not. The stanza information is what allows the platform to find JavaScript methods that your applet provides, as well as configuration and even some contact information for the developer.

The following screen shot shows the typical key and value pairs that are generally used...

![Picture of addons file](http://www.unitraverse.info/Bradley_Pliam/graphics/addons-stanza-scrn-shot.png)

[More information on providing your own add-ons](http://unitraverse.com/products/ud-app/v1.4/sec-13-docs.html#addons_dev) can be found on the Unitraverse.com website.

## Branch view
[Branch view video demo](https://www.youtube.com/watch?v=r6FKeMApMJc)

## Table view
[Table view video demo](https://www.youtube.com/watch?v=f6OBiGN-c08)

## Snippetizer view
[Snippetizer video demo - COMING SOON](https://github.com/bradleyap/Sample-apps-for-Unitraverse/edit/main/README.md)

## Technical notes
These applets work with the latest public version of Unitraverse which is 1.4.265. Very soon there will be some breaking changes that will require that most applets are also updated. Just downloading the current version of the applets I've written along with the Unitraverse update is an easy fix, but if you are writing your own applets, the more recent API changes will require updates to your code. The sample apps, once again, will be the most helpful reference, at least until the documentation gets updated. 
