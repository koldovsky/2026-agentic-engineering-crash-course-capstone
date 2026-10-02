<?php

namespace Tests\Feature;

use Tests\TestCase;

class HomePageTest extends TestCase
{
    public function test_home_page_renders_vue_app_shell(): void
    {
        $this->withoutVite();

        $response = $this->get('/');

        $response->assertOk();
        $response->assertViewIs('app');
        $response->assertSee('id="app"', false);
    }

    public function test_home_page_includes_inline_theme_init_script_in_head_before_app(): void
    {
        $this->withoutVite();

        $response = $this->get('/');

        $response->assertOk();
        $response->assertSeeInOrder(['<head', '<script id="theme-init">', '</head>', '<div id="app"'], false);
    }
}
