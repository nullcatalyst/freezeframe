# FreezeFrame

## Background

Initially, I was looking for a RenderDoc equivalent that could be used with WebGPU in the browser to
help me debug some graphics issues I was having (black screens with nothing being displayed are not
fun). I stumbled upon the very impressive
[webgpu_recorder](https://github.com/brendan-duncan/webgpu_recorder), and was hoping this would
help.

Huge shoutout to the devs working on that, as their implementation inspired this one.

There were unfortunately a few shortcomings that I had with the existing WebGPU Recorder:

1. not (easily) being able to view intermediate inputs/outputs
2. not being able to save an arbitrary frame

The latter issue makes sense, as all buffers and textures need to be created and initialized with
data, so that initialization process needed to be tracked. This meant that the first N frames were
the only ones that could be captured, as it would inevitably include the initialization part.

The former (and more important) issue, of not being able to see intermediate values, is a little
more work. It would require the framework having knowledge of how WebGPU works, instead of just
wrapping all function calls and replaying them back.

Fortunately, we can kill two birds with one stone, by adding some knowledge about how WebGPU works,
we can also track which objects depend on which other ones, so that an arbitrary frame can be
captured.

## Building

[`nodejs`](https://nodejs.org/) and [`npm`](https://www.npmjs.com/) must be installed. I believe
that `npm` is installed with `nodejs` by default, and you can find instructions on installing
`nodejs` on [their website](https://nodejs.org/).

Download the dependencies using `npm`:

```
npm i
```

Compile the library:

```
npx rollup -- -c
```

The library can now be found in `lib/main.js`.

## Usage

### Testing a page that you don't feel like, or can't easily, modify

Compile the source, copy the contents of `lib/main.js`, then head over to the page that you want to
capture.

Add a breakpoint before any javascript runs, reload the page. When the breakpoint is hit, paste the
contents of the file into the console and hit enter. This will wrap all of the WebGPU objects,
making it possible to capture a frame later. Pressing the 'R' key will save the current frame,
printing the source for a webpage that wil run that single frame, to the console. At some point,
this will be changed to make it easier to use.
