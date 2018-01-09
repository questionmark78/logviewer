<?php 

namespace Schuttelaar\LogviewerBundle;

class SchuttelaarLogviewerBundle extends \Pimcore\Extension\Bundle\AbstractPimcoreBundle {

    public function getJsPaths() {
        return [
            '/bundles/schuttelaarlogviewer/js/plugin.js',
            '/bundles/schuttelaarlogviewer/js/panel.js',
            '/bundles/schuttelaarlogviewer/js/logfile.js',
        ];
    }

     public function getCssPaths() {
        return [
            '/bundles/schuttelaarlogviewer/css/admin.css'
        ];
     }
    
}