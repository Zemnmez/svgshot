svgshot
=============================================================================
[svgshot]: #svgshot

Svgshot takes 'screenshots' of webpages as minmised SVGs. This makes them
great for rendering in videos or webpages.


Example
-----------------------------------------------------------------------------
[Example]: #example


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~      bash
svgshot https://en.wikipedia.org
# loading https://en.wikipedia.org
# writing Wikipedia__the_free_encyclopedia.svg
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

[Wikipedia SVG]: ./Wikipedia__the_free_encyclopedia.svg
![Wikipedia SVG]

With `--block` for removing text¹:

[Twitch SVG]: ./Twitch.svg
![Twitch SVG]

[Examples directory]: ./examples
For more examples, take a look at the [Examples directory].

[BLOKK font]: http://www.blokkfont.com/

¹ Orginally this was intended to block out text like the [BLOKK font], but
I couldn't do this without creating truly huge SVGs. If you have any ideas
as to how this could be achieved, let me know!

Installation
-----------------------------------------------------------------------------
[Installation]: #Installation

With node and `inkscape` installed:
```bash
npm install -g svgshot
```

If you don't have `inkscape` installed on windows, try `scoop`:
```powershell
scoop install inkscape
```

For temporary usage you might want to use `npx`:
```bash
npx svgshot https://en.wikipedia.org
```

TODO
-----------------------------------------------------------------------------
Replace SVG dimensions with viewBox so they dont get weirdly warped when
rendered at the wrong size:
https://gist.github.com/fyrebase/4604f540bc4a329ff3bfde225775d39e

License
-----------------------------------------------------------------------------
[License]: #license


MIT License

Copyright (c) 2019 Zemnmez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.