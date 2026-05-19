#!/bin/bash
sed -i '' '/\.flat-scene-media::after {/,/box-shadow: inset 0 0 0 3px var(--any-accent);/d' public/theatre-works.css
sed -i '' '/\.flat-scene-item\.active .flat-scene-media::after {/d' public/theatre-works.css
sed -i '' '/}/d' public/theatre-works.css # Wait, this sed is dangerous.
