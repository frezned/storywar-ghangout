#!python

import jinja2
import os
import subprocess

if not os.path.exists("build"):
	os.mkdir("build")

with open("build/script.js", "w") as f:
	minified = subprocess.check_output(["java", "-jar", "compiler.jar", "src/script.js"])

env = jinja2.Environment(loader=jinja2.FileSystemLoader(searchpath="src"))
template = env.get_template("storywar.xml")
output = template.render(dict(minified_script=minified))

with open("build/storywar.xml", "w") as f:
	f.write(output)

with open("address.txt", "r") as f:
	address = f.read().strip()

print("scp build/storywar.xml " + address)
