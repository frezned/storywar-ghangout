#!/bin/bash

# ensure the directory exists
if [ ! -d build ]; then
	mkdir build
fi

# minify javascript
MINIFY="java -jar compiler.jar"
$MINIFY src/script.js > build/script.js &&

# compile js into public xml
# [TM 9/03/2013] just using awk for now but if it gets any more complex
# switch to some templating or whatever
function compile {
	awk "/$1/{system(\"cat $3\");next}1" $2 > $4
}
compile %SCRIPT% src/page.html build/script.js build/page.html &&
compile %HTML% src/storywar.xml build/page.html build/storywar.xml

# upload xml to server
if [ -f address.txt ]; then
	scp build/storywar.xml `cat address.txt`
else
	echo "Please create 'address.txt' in this directory with scp'able destination!"
fi

