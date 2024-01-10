# Exporter
Version **0.0.1**

This filter exports the behavior pack and resource pack into a ".mcaddon", ".mcworld" or ".mctemplate" file, ready for distribution.

## Usage
This filter requires that you have [nodejs](https://nodejs.org/en/) installed.

Install this filter by running (`regolith install github.com/OdysseyBuilds/regolith-filters/exporter`). Apply the filters similar to the example:

```json
{
	"filters": [
		{
			"filter": "exporter",
			"settings": {
				"name": "My Export",
                "target": "addon",
				"exclude": [ "BP" ]
			}
		}
	]
}
```

### Settings

Name | Default | Description
---- | ------- | -----------
`name` | `''` | Choose name. (optional)
`target` | `''` | Select target archive.
`exclude` | `[]` | Exclude paths from being exported. (optional)

#### exclude
Allowed values: `BP`, `RP`

#### target
Allowed values: `mcaddon`, `addon`, `mcworld`, `world`, `mctemplate`, `template`