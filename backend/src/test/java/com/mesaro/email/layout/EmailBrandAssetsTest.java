package com.mesaro.email.layout;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmailBrandAssetsTest {

    @Test
    void loadsBundledPngWordmarkFromClasspath() {
        EmailBrandAssets assets = new EmailBrandAssets();

        assertThat(assets.logoPngBytes()).isNotEmpty();
        // PNG magic number
        assertThat(assets.logoPngBytes()[0]).isEqualTo((byte) 0x89);
        assertThat(assets.logoPngBytes()[1]).isEqualTo((byte) 0x50);
        assertThat(assets.logoPngBytes()[2]).isEqualTo((byte) 0x4E);
        assertThat(assets.logoPngBytes()[3]).isEqualTo((byte) 0x47);
    }
}
