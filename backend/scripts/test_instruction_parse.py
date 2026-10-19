import re

s = 'c("Flatten to 1/8\\" thickness.", "Dredge in flour.")'

old = re.findall(r'"([^"]*)"', s)
print("OLD:", old)
print("OLD count:", len(old))

new = re.findall(r'"((?:[^"\\]|\\.)*)"', s)
new = [step.replace('\\"', '"') for step in new]
print("NEW:", new)
print("NEW count:", len(new))